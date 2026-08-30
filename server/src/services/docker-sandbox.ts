import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type SandboxExecutionStatus = 'passed' | 'failed' | 'qa_error' | 'sandbox_error' | 'timeout';

export interface FailingTestInfo {
  testName: string;
  failureMessage: string;
}

export interface SandboxExecutionResult {
  status: SandboxExecutionStatus;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  testsPassed: number;
  testsFailed: number;
  timedOut: boolean;
  errorMessage?: string;
  failingTests?: FailingTestInfo[];
}

export interface MaterializeFile {
  path: string;
  content: string;
}

const MAX_OUTPUT_BYTES = 500_000; // 500 KB log cap
const SANDBOX_IMAGE = 'taydau-sandbox:v1';
const DEFAULT_TIMEOUT_MS = 45_000; // 45 seconds host wall-clock timeout

/**
 * Safely materializes Engineer source code and QA test artifacts
 * into an isolated temporary workspace directory on disk.
 */
export async function materializeWorkspace(
  projectId: string,
  runId: string,
  engineerFiles: MaterializeFile[],
  qaFiles: MaterializeFile[]
): Promise<string> {
  const safeProj = projectId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRun = runId.replace(/[^a-zA-Z0-9_-]/g, '');
  const baseDir = path.resolve(process.cwd(), '.taydau', 'workspaces', safeProj, safeRun);

  // Ensure workspace directory is fresh and clean
  await fs.rm(baseDir, { recursive: true, force: true });
  await fs.mkdir(baseDir, { recursive: true });

  function sanitizeContent(raw: string): string {
    if (!raw) return '';
    if (raw.includes('\\n') && !raw.includes('\n')) {
      return raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    }
    return raw;
  }

  // Write Engineer source files
  for (const file of engineerFiles) {
    const norm = path.posix.normalize(file.path.replace(/\\/g, '/'));
    if (norm.startsWith('../') || path.isAbsolute(norm)) {
      throw new Error(`Unsafe path detected during Engineer file materialization: '${file.path}'`);
    }
    const targetPath = path.join(baseDir, norm);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, sanitizeContent(file.content), 'utf8');
  }

  // Write QA test files
  for (const file of qaFiles) {
    const norm = path.posix.normalize(file.path.replace(/\\/g, '/'));
    if (norm.startsWith('../') || path.isAbsolute(norm)) {
      throw new Error(`Unsafe path detected during QA test file materialization: '${file.path}'`);
    }
    const targetPath = path.join(baseDir, norm);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, sanitizeContent(file.content), 'utf8');
  }

  return baseDir;
}

/**
 * Cleans up temporary workspace directory.
 */
export async function cleanupWorkspace(workspaceDir: string): Promise<void> {
  try {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`[docker-sandbox] Failed to cleanup workspace '${workspaceDir}':`, err);
  }
}

/**
 * Parses pytest concise terminal summary for test counts and failing test details.
 */
export function parsePytestSummary(
  stdout: string,
  stderr: string
): { passed: number; failed: number; errors: number; failingTests: FailingTestInfo[] } {
  const combined = `${stdout}\n${stderr}`;
  let passed = 0;
  let failed = 0;
  let errors = 0;

  // Look for standard pytest summary line: "X passed, Y failed, Z error in ..."
  const passedMatch = combined.match(/(\d+)\s+passed/i);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
  }

  const failedMatch = combined.match(/(\d+)\s+failed/i);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
  }

  const errorMatch = combined.match(/(\d+)\s+error/i);
  if (errorMatch) {
    errors = parseInt(errorMatch[1], 10);
  }

  const failingTests: FailingTestInfo[] = [];
  const failRegex = /^FAILED\s+([^\s]+)(?:\s*-\s*(.*))?$/gm;
  let match: RegExpExecArray | null;
  while ((match = failRegex.exec(combined)) !== null) {
    failingTests.push({
      testName: match[1],
      failureMessage: match[2]?.trim() || 'Assertion error during test execution',
    });
  }

  return { passed, failed, errors, failingTests };
}

/**
 * Executes pytest in a hardened, isolated Docker container using safe argument arrays
 * and host-enforced wall-clock timeout.
 */
export async function executeSandboxTests(
  projectId: string,
  runId: string,
  workspaceDir: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const safeId = crypto.randomBytes(4).toString('hex');
  const containerName = `taydau-${projectId.slice(0, 8)}-${safeId}`;

  // Use forward slashes for Docker volume mount path
  const hostMountPath = path.resolve(workspaceDir).replace(/\\/g, '/');

  const dockerArgs = [
    'run',
    '--rm',
    '--name', containerName,
    '--user', '10001:10001',
    '--network', 'none',
    '--read-only',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--memory', '512m',
    '--cpus', '1.0',
    '--pids-limit', '64',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,uid=10001,gid=10001,mode=1777',
    '--tmpfs', '/workspace:rw,size=128m,uid=10001,gid=10001,mode=1777',
    '-v', `${hostMountPath}:/app_source:ro`,
    SANDBOX_IMAGE,
    'sh', '-c', 'cp -r /app_source/* /workspace/ && cd /workspace && pytest -v --tb=short'
  ];

  return new Promise<SandboxExecutionResult>((resolve) => {
    let stdoutAcc = '';
    let stderrAcc = '';
    let timedOut = false;
    let finished = false;

    // Spawn docker process without shell interpolation
    const child = spawn('docker', dockerArgs, {
      shell: false,
      windowsHide: true,
    });

    // Host-enforced wall-clock timeout timer
    const timeoutHandle = setTimeout(() => {
      if (finished) return;
      timedOut = true;
      console.warn(`[docker-sandbox] Execution timed out after ${timeoutMs}ms. Killing container ${containerName}...`);
      
      // Force kill container via host docker CLI
      const killer = spawn('docker', ['kill', containerName], { shell: false });
      killer.on('close', () => {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutAcc.length < MAX_OUTPUT_BYTES) {
        stdoutAcc += chunk.toString('utf8');
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrAcc.length < MAX_OUTPUT_BYTES) {
        stderrAcc += chunk.toString('utf8');
      }
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;
      resolve({
        status: 'sandbox_error',
        exitCode: null,
        stdout: stdoutAcc,
        stderr: stderrAcc,
        durationMs,
        testsPassed: 0,
        testsFailed: 0,
        timedOut: false,
        errorMessage: `Failed to spawn docker process: ${err.message}`,
      });
    });

    child.on('close', (exitCode) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutHandle);
      const durationMs = Date.now() - startTime;

      if (timedOut) {
        resolve({
          status: 'timeout',
          exitCode: exitCode ?? null,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          durationMs,
          testsPassed: 0,
          testsFailed: 0,
          timedOut: true,
          errorMessage: `Host wall-clock timeout exceeded (${timeoutMs}ms)`,
        });
        return;
      }

      const { passed, failed, errors, failingTests } = parsePytestSummary(stdoutAcc, stderrAcc);

      // Deterministic classification based on execution evidence:
      let status: SandboxExecutionStatus;
      if (exitCode === 0 && passed > 0 && failed === 0 && errors === 0) {
        // All acceptance assertions ran and passed
        status = 'passed';
      } else if (failed > 0) {
        // Test assertion failed -> check for test isolation / state leakage before classifying as product defect
        status = 'failed';
      } else if (exitCode === 4 || exitCode === 5 || (passed === 0 && failed === 0 && exitCode !== 0)) {
        // Pytest collection/import/syntax error before assertions ran -> QA artifact error
        status = 'qa_error';
      } else if (errors > 0) {
        status = 'qa_error';
      } else {
        status = 'failed';
      }

      // If status is failed, check if failing test(s) pass in isolation (test isolation check)
      if (status === 'failed' && failingTests.length > 0) {
        verifyTestIsolation(hostMountPath, failingTests, timeoutMs)
          .then((isolationCheck) => {
            if (isolationCheck.hasIsolationError) {
              console.warn(`[docker-sandbox] QA test isolation failure detected: ${isolationCheck.leakageDetails}`);
              resolve({
                status: 'qa_error',
                exitCode: exitCode ?? null,
                stdout: stdoutAcc,
                stderr: stderrAcc + `\n\n[TAYDAU ISOLATION GATE] Detected state leakage: ${isolationCheck.leakageDetails}`,
                durationMs,
                testsPassed: passed,
                testsFailed: failed,
                timedOut: false,
                failingTests,
                errorMessage: `QA_TEST_ISOLATION_ERROR: ${isolationCheck.leakageDetails}`,
              });
            } else {
              resolve({
                status,
                exitCode: exitCode ?? null,
                stdout: stdoutAcc,
                stderr: stderrAcc,
                durationMs,
                testsPassed: passed,
                testsFailed: failed,
                timedOut: false,
                failingTests,
              });
            }
          })
          .catch(() => {
            resolve({
              status,
              exitCode: exitCode ?? null,
              stdout: stdoutAcc,
              stderr: stderrAcc,
              durationMs,
              testsPassed: passed,
              testsFailed: failed,
              timedOut: false,
              failingTests,
            });
          });
        return;
      }

      resolve({
        status,
        exitCode: exitCode ?? null,
        stdout: stdoutAcc,
        stderr: stderrAcc,
        durationMs,
        testsPassed: passed,
        testsFailed: failed,
        timedOut: false,
        failingTests,
      });
    });
  });
}

/**
 * Verifies whether failing test(s) pass when executed in pure isolation in a fresh container.
 * If a test passes alone, its failure in the full suite was caused by state contamination.
 */
async function verifyTestIsolation(
  hostMountPath: string,
  failingTests: Array<{ testName: string; failureMessage: string }>,
  timeoutMs: number
): Promise<{ hasIsolationError: boolean; leakageDetails: string }> {
  for (const ft of failingTests) {
    const nodeTarget = ft.testName.trim();
    if (!nodeTarget.startsWith('tests/')) continue;

    const containerName = `taydau-iso-${crypto.randomBytes(4).toString('hex')}`;
    const dockerArgs = [
      'run',
      '--rm',
      '--name', containerName,
      '--user', '10001:10001',
      '--network', 'none',
      '--read-only',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '--memory', '512m',
      '--cpus', '1.0',
      '--pids-limit', '64',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,uid=10001,gid=10001,mode=1777',
      '--tmpfs', '/workspace:rw,size=128m,uid=10001,gid=10001,mode=1777',
      '-v', `${hostMountPath}:/app_source:ro`,
      SANDBOX_IMAGE,
      'sh', '-c', `cp -r /app_source/* /workspace/ && cd /workspace && pytest -q ${nodeTarget}`
    ];

    const result = await new Promise<{ exitCode: number | null }>((res) => {
      const child = spawn('docker', dockerArgs, { shell: false, windowsHide: true });
      const timer = setTimeout(() => {
        spawn('docker', ['kill', containerName], { shell: false });
        res({ exitCode: -1 });
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        res({ exitCode: code });
      });
      child.on('error', () => {
        clearTimeout(timer);
        res({ exitCode: -1 });
      });
    });

    if (result.exitCode === 0) {
      return {
        hasIsolationError: true,
        leakageDetails: `Test '${nodeTarget}' passed when executed alone in a fresh sandbox, proving failure in the full suite was caused by test state contamination / lack of test fixture isolation.`,
      };
    }
  }

  return { hasIsolationError: false, leakageDetails: '' };
}

import { query } from '../db/pool.js';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';

export interface SecurityFinding {
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  filePath: string | null;
  evidence: string;
  status: 'open' | 'resolved' | 'accepted';
}

export interface SecurityGateResult {
  passed: boolean;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: SecurityFinding[];
  checksSummary: Record<string, 'pass' | 'fail' | 'warning'>;
}

// 1. Dependency Allowlist for generated microservices
const ALLOWED_PACKAGES = new Set([
  'fastapi',
  'uvicorn',
  'sqlalchemy',
  'pydantic',
  'pydantic-core',
  'pydantic-settings',
  'aiosqlite',
  'pytest',
  'pytest-asyncio',
  'pytest-mock',
  'httpx',
  'anyio',
  'asyncpg',
  'alembic',
  'sqlite3',
  'passlib',
  'bcrypt',
  'python-jose',
  'python-multipart',
  'python-dotenv',
  'email-validator',
  'starlette',
  'requests',
  'typing-extensions',
  'jinja2',
  'markupsafe',
  'gunicorn',
  'cryptography',
  'psycopg2-binary',
  'pyjwt',
  'slowapi',
  'limits',
  'sqlmodel',
  'aiofiles',
]);

// 2. Secret Scan Patterns
const SECRET_PATTERNS = [
  { name: 'Generic API Key', regex: /(?:api_key|apikey|secret_key|app_secret|auth_token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i, severity: 'critical' as const },
  { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i, severity: 'critical' as const },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: 'critical' as const },
  { name: 'Hardcoded Password', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, severity: 'high' as const },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'critical' as const },
];

// 3. Dangerous Capability Patterns
const DANGEROUS_PATTERNS = [
  { name: 'Dynamic Evaluation (eval/exec)', regex: /\b(eval|exec)\s*\(/, severity: 'critical' as const, rule: 'NO_EVAL_EXEC' },
  { name: 'Arbitrary Shell Execution (os.system/os.popen)', regex: /\bos\.(system|popen|spawn)\s*\(/, severity: 'critical' as const, rule: 'NO_OS_SYSTEM' },
  { name: 'Subprocess Invocation', regex: /\bsubprocess\.(run|Popen|call|check_output)\s*\(/, severity: 'high' as const, rule: 'NO_SUBPROCESS' },
  { name: 'Unsafe Deserialization (pickle)', regex: /\bpickle\.(loads?|Unpickler)\s*\(/, severity: 'high' as const, rule: 'NO_PICKLE' },
  { name: 'Direct Socket Connection', regex: /\bsocket\.socket\s*\(/, severity: 'medium' as const, rule: 'NO_RAW_SOCKET' },
];

/**
 * Runs the deterministic security gate against a collection of source files.
 */
export async function runSecurityGate(
  projectId: string,
  files: Array<{ path: string; content: string }>
): Promise<SecurityGateResult> {
  const findings: SecurityFinding[] = [];
  const checksSummary: Record<string, 'pass' | 'fail' | 'warning'> = {
    dependencyAllowlist: 'pass',
    secretScanner: 'pass',
    dangerousCapabilities: 'pass',
    pythonSyntaxValidation: 'pass',
  };

  // Check A: Secret Scanning
  for (const file of files) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(file.content)) {
        findings.push({
          source: 'secret_scanner',
          severity: pattern.severity,
          rule: pattern.name,
          filePath: file.path,
          evidence: `Detected potential ${pattern.name} in ${file.path}`,
          status: 'open',
        });
        checksSummary.secretScanner = 'fail';
      }
    }
  }

  // Check B: Dangerous Capabilities
  for (const file of files) {
    if (!file.path.endsWith('.py')) continue;
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.regex.test(file.content)) {
        findings.push({
          source: 'dangerous_capability_scanner',
          severity: pattern.severity,
          rule: pattern.rule,
          filePath: file.path,
          evidence: `Detected forbidden call ${pattern.name} in ${file.path}`,
          status: 'open',
        });
        if (pattern.severity === 'critical' || pattern.severity === 'high') {
          checksSummary.dangerousCapabilities = 'fail';
        } else if (checksSummary.dangerousCapabilities !== 'fail') {
          checksSummary.dangerousCapabilities = 'warning';
        }
      }
    }
  }

  // Check C: Dependency Allowlist
  const reqFile = files.find((f) => f.path === 'requirements.txt');
  if (reqFile) {
    const lines = reqFile.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().split(/[<>=;@\[]/)[0].trim().toLowerCase();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (!ALLOWED_PACKAGES.has(trimmed)) {
        findings.push({
          source: 'dependency_allowlist',
          severity: 'high',
          rule: 'UNAPPROVED_DEPENDENCY',
          filePath: 'requirements.txt',
          evidence: `Unapproved package '${trimmed}' found in requirements.txt`,
          status: 'open',
        });
        checksSummary.dependencyAllowlist = 'fail';
      }
    }
  }

  // Check D: Python Syntax Validation
  for (const file of files) {
    if (!file.path.endsWith('.py')) continue;
    // Check for common Python syntax red flags
    if (file.content.includes('\\n') && !file.content.includes('\n')) {
      findings.push({
        source: 'syntax_validator',
        severity: 'high',
        rule: 'UNESCAPED_NEWLINE_IN_SOURCE',
        filePath: file.path,
        evidence: `File ${file.path} contains unescaped literal \\n sequences`,
        status: 'open',
      });
      checksSummary.pythonSyntaxValidation = 'fail';
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  // Release policy: 0 critical and 0 high findings allowed for pass
  const passed = criticalCount === 0 && highCount === 0;

  // Persist findings in database
  await query('DELETE FROM security_findings WHERE project_id = $1', [projectId]);
  for (const f of findings) {
    await query(
      `INSERT INTO security_findings (
        project_id, source, severity, rule, file_path, evidence, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, f.source, f.severity, f.rule, f.filePath, f.evidence, f.status]
    );
  }

  return {
    passed,
    totalFindings: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findings,
    checksSummary,
  };
}

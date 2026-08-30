import path from 'path';
import type { EngineerOutput, GeneratedFile } from '../schemas/code-artifact.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  totalSizeBytes: number;
}

const ALLOWED_EXTENSIONS = new Set(['.py', '.txt', '.toml', '.md', '.json']);
const PROHIBITED_EXTENSIONS = new Set(['.exe', '.sh', '.bat', '.cmd', '.dll', '.so', '.bin', '.ps1']);
const ALLOWED_PACKAGES = new Set([
  'fastapi',
  'uvicorn',
  'pydantic',
  'sqlalchemy',
  'aiosqlite',
  'pytest',
  'httpx',
  'python-dotenv',
]);
const PROHIBITED_PACKAGES = new Set([
  'psycopg2',
  'psycopg2-binary',
  'asyncpg',
  'redis',
  'boto3',
  'pymongo',
  'celery',
  'kafka-python',
]);

const MAX_FILES = 15;
const MAX_FILE_SIZE_BYTES = 50_000;
const MAX_TOTAL_SIZE_BYTES = 200_000;

export function validateEngineerArtifacts(
  output: EngineerOutput,
  implementationTaskCodes: string[],
  qaTaskCodes: string[] = []
): ValidationResult {
  const errors: string[] = [];
  let totalSizeBytes = 0;
  const seenPaths = new Set<string>();

  // 1. Check file count
  if (!output.files || output.files.length === 0) {
    errors.push('Engineer output contains no files.');
    return { valid: false, errors, totalSizeBytes: 0 };
  }

  if (output.files.length > MAX_FILES) {
    errors.push(`File count exceeds limit: ${output.files.length} > ${MAX_FILES}`);
  }

  // 2. Validate each file path & content
  for (const file of output.files) {
    const rawPath = file.path?.trim() ?? '';
    const content = file.content ?? '';
    const fileBytes = Buffer.byteLength(content, 'utf8');
    totalSizeBytes += fileBytes;

    // Check file size
    if (fileBytes > MAX_FILE_SIZE_BYTES) {
      errors.push(`File '${rawPath}' exceeds maximum size limit (${fileBytes} > ${MAX_FILE_SIZE_BYTES} bytes).`);
    }

    // Path security checks
    if (!rawPath) {
      errors.push('Encountered file with empty path.');
      continue;
    }

    if (rawPath.includes('\0')) {
      errors.push(`Path contains null byte: '${rawPath}'`);
      continue;
    }

    // Check for absolute, UNC, or Windows drive paths
    if (
      rawPath.startsWith('/') ||
      rawPath.startsWith('\\') ||
      /^[a-zA-Z]:/.test(rawPath) ||
      rawPath.startsWith('//') ||
      rawPath.startsWith('\\\\')
    ) {
      errors.push(`Prohibited absolute/UNC path: '${rawPath}'`);
    }

    // Normalize path
    const normalized = path.posix.normalize(rawPath.replace(/\\/g, '/'));

    if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
      errors.push(`Directory traversal detected in path: '${rawPath}'`);
    }

    if (seenPaths.has(normalized)) {
      errors.push(`Duplicate normalized path detected: '${normalized}'`);
    }
    seenPaths.add(normalized);

    // Block sensitive/hidden files
    const basename = path.posix.basename(normalized);
    if (basename.startsWith('.env') || basename.toLowerCase().includes('apikey') || basename.toLowerCase().includes('secret')) {
      errors.push(`Prohibited sensitive filename: '${normalized}'`);
    }

    // Extension checks
    const ext = path.posix.extname(normalized).toLowerCase();
    if (PROHIBITED_EXTENSIONS.has(ext)) {
      errors.push(`Prohibited executable extension '${ext}' in path: '${normalized}'`);
    }

    // Path prefix check: Must start with app/ or be requirements.txt / pyproject.toml
    const isAppFile = normalized.startsWith('app/');
    const isManifest = normalized === 'requirements.txt' || normalized === 'pyproject.toml' || normalized === 'README.md';
    const isTestFile = normalized.startsWith('tests/') || basename.startsWith('test_');

    if (isTestFile) {
      errors.push(
        `Engineer is prohibited from generating test files ('${normalized}'). Independent QA will generate test suites.`
      );
    }

    if (!isAppFile && !isManifest) {
      errors.push(`Path outside allowed directories ('app/' or root manifest): '${normalized}'`);
    }

    // Related task codes check
    if (!file.relatedTaskCodes || file.relatedTaskCodes.length === 0) {
      errors.push(`File '${normalized}' has no linked task codes.`);
    } else {
      for (const tCode of file.relatedTaskCodes) {
        if (qaTaskCodes.includes(tCode)) {
          errors.push(
            `File '${normalized}' references QA verification task '${tCode}'. Engineer code artifacts may only fulfill implementation tasks.`
          );
        } else if (!implementationTaskCodes.includes(tCode)) {
          errors.push(`File '${normalized}' references unknown task code '${tCode}'.`);
        }
      }
    }

    // Dependency check if requirements.txt
    if (basename === 'requirements.txt') {
      const depErrors = validateRequirementsTxt(content);
      errors.push(...depErrors);
    }
  }

  // Check total bundle size
  if (totalSizeBytes > MAX_TOTAL_SIZE_BYTES) {
    errors.push(`Total source bundle exceeds maximum size limit (${totalSizeBytes} > ${MAX_TOTAL_SIZE_BYTES} bytes).`);
  }

  // 3. Task coverage verification (Every implementation task must be covered)
  const coveredTaskSet = new Set<string>();
  for (const cov of output.taskCoverage || []) {
    if (implementationTaskCodes.includes(cov.taskCode) && cov.filePaths.length > 0) {
      coveredTaskSet.add(cov.taskCode);
    }
  }
  // Also collect from files' relatedTaskCodes
  for (const file of output.files) {
    for (const tCode of file.relatedTaskCodes || []) {
      if (implementationTaskCodes.includes(tCode)) {
        coveredTaskSet.add(tCode);
      }
    }
  }

  for (const expectedCode of implementationTaskCodes) {
    if (!coveredTaskSet.has(expectedCode)) {
      errors.push(`Orphan implementation task: '${expectedCode}' has no generated code coverage.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSizeBytes,
  };
}

function validateRequirementsTxt(content: string): string[] {
  const errors: string[] = [];
  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

  for (const line of lines) {
    // Extract package name (strip version specifiers)
    const pkgName = line.split(/[>=<~!]/)[0].trim().toLowerCase();
    if (!pkgName) continue;

    if (PROHIBITED_PACKAGES.has(pkgName)) {
      errors.push(`Prohibited external database/network dependency in requirements.txt: '${pkgName}'`);
    }
  }
  return errors;
}

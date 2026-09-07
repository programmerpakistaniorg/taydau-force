import path from 'path';
import type { QAOutput, GeneratedTestFile } from '../schemas/qa-artifact.js';

export interface QAValidationResult {
  valid: boolean;
  errors: string[];
  totalSizeBytes: number;
}

const ALLOWED_EXTENSIONS = new Set(['.py', '.ini', '.toml', '.json']);
const PROHIBITED_EXTENSIONS = new Set(['.exe', '.sh', '.bat', '.cmd', '.dll', '.so', '.bin', '.ps1']);
const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 50_000;
const MAX_TOTAL_SIZE_BYTES = 200_000;

// Prohibited dangerous patterns in Python test code
const PROHIBITED_CODE_PATTERNS = [
  /\bsubprocess\b/i,
  /\bos\.system\b/i,
  /\bos\.popen\b/i,
  /\bpty\b/i,
  /\bshutil\.rmtree\b/i,
  /\bsocket\b/i,
  /\bctypes\b/i,
  /\bdocker\b/i,
  /\bboto3\b/i,
  /\bbotocore\b/i,
  /\bimportlib\b/i,
];

// Prohibited internal imports that couple QA tests to implementation internals
const PROHIBITED_INTERNAL_IMPORTS = [
  /from\s+app\.(database|models|schemas|api|services|crud|db|core|utils|config)\b/i,
  /import\s+app\.(database|models|schemas|api|services|crud|db|core|utils|config)\b/i,
  /from\s+app\s+import\s+(?!main\b)[a-zA-Z0-9_]+/i,
];

export function validateQAArtifacts(
  output: QAOutput,
  expectedRequirementCodes: string[]
): QAValidationResult {
  const errors: string[] = [];
  let totalSizeBytes = 0;
  const seenPaths = new Set<string>();

  if (!output.testFiles || output.testFiles.length === 0) {
    errors.push('QA output contains no test files.');
    return { valid: false, errors, totalSizeBytes: 0 };
  }

  if (output.testFiles.length > MAX_FILES) {
    errors.push(`Test file count exceeds limit: ${output.testFiles.length} > ${MAX_FILES}`);
  }

  for (const file of output.testFiles) {
    const rawPath = file.path?.trim() ?? '';
    const content = file.content ?? '';
    const fileBytes = Buffer.byteLength(content, 'utf8');
    totalSizeBytes += fileBytes;

    if (fileBytes > MAX_FILE_SIZE_BYTES) {
      errors.push(`Test file '${rawPath}' exceeds size limit (${fileBytes} > ${MAX_FILE_SIZE_BYTES} bytes).`);
    }

    if (!rawPath) {
      errors.push('Encountered test file with empty path.');
      continue;
    }

    if (rawPath.includes('\0')) {
      errors.push(`Path contains null byte: '${rawPath}'`);
      continue;
    }

    if (
      rawPath.startsWith('/') ||
      rawPath.startsWith('\\') ||
      /^[a-zA-Z]:/.test(rawPath) ||
      rawPath.startsWith('//') ||
      rawPath.startsWith('\\\\')
    ) {
      errors.push(`Prohibited absolute/UNC path: '${rawPath}'`);
    }

    const normalized = path.posix.normalize(rawPath.replace(/\\/g, '/'));

    if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
      errors.push(`Directory traversal detected in path: '${rawPath}'`);
    }

    if (seenPaths.has(normalized)) {
      errors.push(`Duplicate normalized path detected: '${normalized}'`);
    }
    seenPaths.add(normalized);

    const basename = path.posix.basename(normalized);
    if (basename.startsWith('.env') || basename.toLowerCase().includes('secret') || basename.toLowerCase().includes('apikey')) {
      errors.push(`Prohibited sensitive filename: '${normalized}'`);
    }

    const ext = path.posix.extname(normalized).toLowerCase();
    if (PROHIBITED_EXTENSIONS.has(ext)) {
      errors.push(`Prohibited executable extension '${ext}' in path: '${normalized}'`);
    }

    // QA tests must be in tests/ directory or pytest.ini
    const isTestsDir = normalized.startsWith('tests/');
    const isPytestConfig = normalized === 'pytest.ini';
    if (!isTestsDir && !isPytestConfig) {
      errors.push(`QA test path outside allowed 'tests/' directory: '${normalized}'`);
    }

    // Content security: check for prohibited dangerous system calls
    for (const pattern of PROHIBITED_CODE_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`Prohibited dangerous pattern '${pattern.source}' detected in test file '${normalized}'.`);
      }
    }

    // Enforce public black-box execution contract: QA must only import 'from app.main import app'
    for (const pattern of PROHIBITED_INTERNAL_IMPORTS) {
      if (pattern.test(content)) {
        errors.push(
          `QA test file '${normalized}' violates public contract: internal application import matching '${pattern.source}' is prohibited. QA must only import 'from app.main import app' and test purely via HTTP.`
        );
      }
    }

    // Check requirement links (except for fixture/config files like conftest.py)
    const isFixture = basename === 'conftest.py' || basename === 'pytest.ini';
    if (!isFixture && (!file.relatedRequirementCodes || file.relatedRequirementCodes.length === 0)) {
      errors.push(`Test file '${normalized}' has no linked requirement codes.`);
    } else if (file.relatedRequirementCodes) {
      for (const rCode of file.relatedRequirementCodes) {
        if (!expectedRequirementCodes.includes(rCode)) {
          errors.push(`Test file '${normalized}' references unknown requirement code '${rCode}'.`);
        }
      }
    }
  }

  if (totalSizeBytes > MAX_TOTAL_SIZE_BYTES) {
    errors.push(`Total test bundle exceeds maximum size limit (${totalSizeBytes} > ${MAX_TOTAL_SIZE_BYTES} bytes).`);
  }

  // Verify all requirements are covered by tests
  const coveredReqSet = new Set<string>();
  for (const cov of output.requirementCoverage || []) {
    if (expectedRequirementCodes.includes(cov.requirementCode) && cov.testNames.length > 0) {
      coveredReqSet.add(cov.requirementCode);
    }
  }
  for (const file of output.testFiles) {
    for (const rCode of file.relatedRequirementCodes || []) {
      if (expectedRequirementCodes.includes(rCode)) {
        coveredReqSet.add(rCode);
      }
    }
  }

  for (const expReq of expectedRequirementCodes) {
    if (!coveredReqSet.has(expReq)) {
      errors.push(`Orphan requirement without QA test coverage: '${expReq}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSizeBytes,
  };
}

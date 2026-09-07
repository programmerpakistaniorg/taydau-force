import crypto from 'crypto';
import { query, withTransaction } from '../db/pool.js';

export interface FileArtifact {
  path: string;
  content: string;
  version?: number;
}

/**
 * Calculates deterministic SHA-256 hash of string content (normalizing line endings).
 */
export function calculateContentHash(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Calculates a deterministic digest for an implementation bundle.
 * Sorts files alphabetically by normalized path and hashes path + content.
 */
export function calculateImplementationBundleDigest(files: FileArtifact[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const hasher = crypto.createHash('sha256');

  for (const file of sorted) {
    const normPath = file.path.replace(/\\/g, '/').toLowerCase();
    const contentHash = calculateContentHash(file.content);
    hasher.update(`${normPath}:${contentHash}\n`, 'utf8');
  }

  return hasher.digest('hex');
}

/**
 * Calculates a deterministic digest for a QA test suite.
 * Sorts files by normalized path and includes version if present.
 */
export function calculateQASuiteDigest(qaFiles: FileArtifact[]): string {
  const sorted = [...qaFiles].sort((a, b) => a.path.localeCompare(b.path));
  const hasher = crypto.createHash('sha256');

  for (const file of sorted) {
    const normPath = file.path.replace(/\\/g, '/').toLowerCase();
    const contentHash = calculateContentHash(file.content);
    const version = file.version || 1;
    hasher.update(`${normPath}:v${version}:${contentHash}\n`, 'utf8');
  }

  return hasher.digest('hex');
}

/**
 * Formally freezes a QA test suite in the database.
 * Computes individual file hashes, updates qa_test_artifacts, and persists to qa_suites.
 */
export async function freezeQASuite(
  projectId: string,
  qaFiles: FileArtifact[],
  version: number = 1
): Promise<{ suiteSha256: string; fileCount: number }> {
  const suiteSha256 = calculateQASuiteDigest(qaFiles);

  await withTransaction(async (client) => {
    // 1. Update individual QA artifacts with sha256 and is_frozen = true
    for (const file of qaFiles) {
      const fileHash = calculateContentHash(file.content);
      await client.query(
        `UPDATE qa_test_artifacts
         SET sha256 = $1, is_frozen = true
         WHERE project_id = $2 AND file_path = $3`,
        [fileHash, projectId, file.path]
      );
    }

    // 2. Persist to qa_suites table
    await client.query(
      `INSERT INTO qa_suites (
        project_id, suite_sha256, file_count, is_frozen, version
      ) VALUES ($1, $2, $3, true, $4)`,
      [projectId, suiteSha256, qaFiles.length, version]
    );
  });

  return { suiteSha256, fileCount: qaFiles.length };
}

/**
 * Retrieves the authoritative frozen QA suite hash for a project.
 */
export async function getAuthoritativeQASuiteHash(projectId: string): Promise<string | null> {
  const res = await query(
    `SELECT suite_sha256 FROM qa_suites 
     WHERE project_id = $1 AND is_frozen = true 
     ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  return res.rows.length > 0 ? res.rows[0].suite_sha256 : null;
}

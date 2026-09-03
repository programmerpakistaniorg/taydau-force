import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/pool.js';
import { REWORK_CONFIG } from '../config/rework.js';
import type { ClassificationResult } from './defect-classifier.js';

export interface PersistedDefect {
  id: string;
  projectId: string;
  defectNumber: number;
  code: string;
  source: string;
  title: string;
  severity: string;
  status: string;
  description: string;
  evidence: Record<string, any>;
  failureSignature: string;
  reworkAttempt: number;
  resolvedAt?: string;
  resolutionArtifactId?: string;
  resolutionEvidence?: Record<string, any>;
  createdAt: string;
}

export interface ImplementationRevisionRecord {
  id: string;
  projectId: string;
  version: number;
  summary: string;
  fileCount: number;
  totalBytes: number;
  sha256: string;
  reworkAttempt: number;
  createdAt: string;
}

export class DefectService {
  /**
   * Computes the deterministic canonical SHA-256 fingerprint for a complete implementation revision.
   * Algorithm:
   * 1. Sort files by normalized POSIX path
   * 2. Compute SHA-256 of each file's content
   * 3. Aggregate entries as "${normalizedPath}:${contentSha}\n"
   * 4. Compute SHA-256 over entire aggregate string
   * Excludes timestamps, DB IDs, and transient metadata.
   */
  static computeImplementationRevisionSha(files: Array<{ path: string; content: string }>): string {
    const sorted = [...files].sort((a, b) => {
      const na = a.path.replace(/\\/g, '/').toLowerCase();
      const nb = b.path.replace(/\\/g, '/').toLowerCase();
      return na.localeCompare(nb);
    });

    const lines = sorted.map((f) => {
      const normPath = f.path.replace(/\\/g, '/').toLowerCase();
      const contentSha = crypto.createHash('sha256').update(f.content || '', 'utf8').digest('hex');
      return `${normPath}:${contentSha}`;
    });

    const aggregate = lines.join('\n');
    return crypto.createHash('sha256').update(aggregate, 'utf8').digest('hex');
  }

  /**
   * Records or updates a defect with race-safe number allocation and transactionally safe deduplication.
   */
  static async recordOrUpdateDefect(
    projectId: string,
    classification: ClassificationResult,
    sourceArtifactId?: string,
    requirementIds: string[] = [],
    externalClient?: PoolClient
  ): Promise<{ defect: PersistedDefect; isNew: boolean }> {
    const execute = async (client: PoolClient) => {
      // 1. Check for existing unresolved defect with same failure signature
      const existingRes = await client.query(
        `SELECT id, project_id AS "projectId", defect_number AS "defectNumber", code,
                source, title, severity, status, description, evidence,
                failure_signature AS "failureSignature", rework_attempt AS "reworkAttempt",
                resolved_at AS "resolvedAt", resolution_artifact_id AS "resolutionArtifactId",
                resolution_evidence AS "resolutionEvidence", created_at AS "createdAt"
         FROM defects
         WHERE project_id = $1 AND failure_signature = $2
           AND status NOT IN ('resolved', 'rejected_invalid')
         FOR UPDATE`,
        [projectId, classification.failureSignature]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        // Idempotently update attempt and latest evidence
        const updatedRes = await client.query(
          `UPDATE defects
           SET rework_attempt = rework_attempt + 1,
               evidence = $1,
               description = $2,
               status = 'rework_in_progress'
           WHERE id = $3
           RETURNING id, project_id AS "projectId", defect_number AS "defectNumber", code,
                     source, title, severity, status, description, evidence,
                     failure_signature AS "failureSignature", rework_attempt AS "reworkAttempt",
                     resolved_at AS "resolvedAt", resolution_artifact_id AS "resolutionArtifactId",
                     resolution_evidence AS "resolutionEvidence", created_at AS "createdAt"`,
          [JSON.stringify(classification.evidence), classification.summary, existing.id]
        );
        return { defect: updatedRes.rows[0], isNew: false };
      }

      // 2. Allocate race-safe defect number using serialized lock
      const maxNumRes = await client.query(
        `SELECT COALESCE(MAX(defect_number), 0) + 1 AS next_num
         FROM defects
         WHERE project_id = $1`,
        [projectId]
      );
      const nextNum = parseInt(maxNumRes.rows[0].next_num, 10);
      const code = `DEF-${String(nextNum).padStart(3, '0')}`;

      // 3. Insert new defect
      const insertRes = await client.query(
        `INSERT INTO defects (
           project_id, defect_number, code, source, source_artifact_id,
           title, severity, status, description, evidence,
           failure_signature, rework_attempt
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9, $10, 0)
         RETURNING id, project_id AS "projectId", defect_number AS "defectNumber", code,
                   source, title, severity, status, description, evidence,
                   failure_signature AS "failureSignature", rework_attempt AS "reworkAttempt",
                   resolved_at AS "resolvedAt", resolution_artifact_id AS "resolutionArtifactId",
                   resolution_evidence AS "resolutionEvidence", created_at AS "createdAt"`,
        [
          projectId,
          nextNum,
          code,
          classification.taxonomy,
          sourceArtifactId || null,
          classification.title,
          classification.isBlocking ? 'critical' : 'medium',
          classification.summary,
          JSON.stringify(classification.evidence),
          classification.failureSignature,
        ]
      );
      const newDefect = insertRes.rows[0];

      // 4. Link requirement traceability
      for (const reqId of requirementIds) {
        await client.query(
          `INSERT INTO defect_requirements (defect_id, requirement_id)
           VALUES ($1, $2)
           ON CONFLICT (defect_id, requirement_id) DO NOTHING`,
          [newDefect.id, reqId]
        );
      }

      return { defect: newDefect, isNew: true };
    };

    if (externalClient) {
      return execute(externalClient);
    }
    return withTransaction(execute);
  }

  /**
   * Records a complete implementation revision and links any addressed defects.
   */
  static async recordImplementationRevision(
    projectId: string,
    version: number,
    files: Array<{ path: string; content: string }>,
    summary: string,
    reworkAttempt: number,
    addressedDefectIds: string[] = [],
    options?: {
      manifest?: Record<string, any>;
      fileInventory?: Record<string, any>[];
      externalClient?: PoolClient;
    }
  ): Promise<ImplementationRevisionRecord> {
    const sha256 = this.computeImplementationRevisionSha(files);
    const totalBytes = files.reduce((acc, f) => acc + Buffer.byteLength(f.content || '', 'utf8'), 0);
    const manifestJson = options?.manifest ? JSON.stringify(options.manifest) : '{}';
    const inventoryJson = options?.fileInventory ? JSON.stringify(options.fileInventory) : '[]';

    const execute = async (client: PoolClient) => {
      const insRes = await client.query(
        `INSERT INTO implementation_revisions (
           project_id, version, summary, file_count, total_bytes, sha256, rework_attempt, manifest, file_inventory
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (project_id, version) DO UPDATE
           SET summary = EXCLUDED.summary,
               file_count = EXCLUDED.file_count,
               total_bytes = EXCLUDED.total_bytes,
               sha256 = EXCLUDED.sha256,
               rework_attempt = EXCLUDED.rework_attempt,
               manifest = EXCLUDED.manifest,
               file_inventory = EXCLUDED.file_inventory
         RETURNING id, project_id AS "projectId", version, summary,
                   file_count AS "fileCount", total_bytes AS "totalBytes",
                   sha256, rework_attempt AS "reworkAttempt", created_at AS "createdAt"`,
        [projectId, version, summary, files.length, totalBytes, sha256, reworkAttempt, manifestJson, inventoryJson]
      );
      const revision = insRes.rows[0];

      for (const defectId of addressedDefectIds) {
        await client.query(
          `INSERT INTO implementation_revision_defects (implementation_revision_id, defect_id)
           VALUES ($1, $2)
           ON CONFLICT (implementation_revision_id, defect_id) DO NOTHING`,
          [revision.id, defectId]
        );
      }

      return revision;
    };

    if (options?.externalClient) {
      return execute(options.externalClient);
    }
    return withTransaction(execute);
  }

  /**
   * No-progress detection: checks if consecutive revisions produced identical hashes under unresolved defects.
   */
  static async checkNoProgress(
    projectId: string,
    newSha: string,
    externalClient?: PoolClient
  ): Promise<{ noProgress: boolean; unchangedCount: number }> {
    const q = externalClient ? externalClient.query.bind(externalClient) : query;
    const res = await q(
      `SELECT sha256 FROM implementation_revisions
       WHERE project_id = $1
       ORDER BY version DESC
       LIMIT 3`,
      [projectId]
    );

    if (res.rows.length === 0) {
      return { noProgress: false, unchangedCount: 0 };
    }

    let unchangedCount = 0;
    for (const row of res.rows) {
      if (row.sha256 === newSha) {
        unchangedCount++;
      } else {
        break;
      }
    }

    return {
      noProgress: unchangedCount >= REWORK_CONFIG.NO_PROGRESS_THRESHOLD,
      unchangedCount,
    };
  }

  /**
   * Source-specific defect resolution with resolution evidence.
   */
  static async resolveDefect(
    defectId: string,
    evidence: Record<string, any>,
    resolutionArtifactId?: string,
    externalClient?: PoolClient
  ): Promise<void> {
    const q = externalClient ? externalClient.query.bind(externalClient) : query;
    await q(
      `UPDATE defects
       SET status = 'resolved',
           resolved_at = now(),
           resolution_evidence = $1,
           resolution_artifact_id = $2
       WHERE id = $3`,
      [JSON.stringify(evidence), resolutionArtifactId || null, defectId]
    );
  }

  /**
   * Escalates all unresolved defects for a project.
   */
  static async escalateUnresolvedDefects(projectId: string, reason: string, externalClient?: PoolClient): Promise<void> {
    const q = externalClient ? externalClient.query.bind(externalClient) : query;
    await q(
      `UPDATE defects
       SET status = 'escalated',
           evidence = jsonb_set(COALESCE(evidence, '{}'::jsonb), '{escalationReason}', $1::jsonb)
       WHERE project_id = $2 AND status NOT IN ('resolved', 'rejected_invalid')`,
      [JSON.stringify(reason), projectId]
    );
  }

  /**
   * Retrieves active open/rework defects for a project.
   */
  static async getOpenDefects(projectId: string): Promise<PersistedDefect[]> {
    const res = await query(
      `SELECT id, project_id AS "projectId", defect_number AS "defectNumber", code,
              source, title, severity, status, description, evidence,
              failure_signature AS "failureSignature", rework_attempt AS "reworkAttempt",
              resolved_at AS "resolvedAt", resolution_artifact_id AS "resolutionArtifactId",
              resolution_evidence AS "resolutionEvidence", created_at AS "createdAt"
       FROM defects
       WHERE project_id = $1 AND status NOT IN ('resolved', 'rejected_invalid')
       ORDER BY defect_number ASC`,
      [projectId]
    );
    return res.rows;
  }

  /**
   * Retrieves all defects for project with sanitized public data.
   */
  static async getAllProjectDefects(projectId: string): Promise<PersistedDefect[]> {
    const res = await query(
      `SELECT d.id, d.project_id AS "projectId", d.defect_number AS "defectNumber", d.code,
              d.source, d.title, d.severity, d.status, d.description, d.evidence,
              d.failure_signature AS "failureSignature", d.rework_attempt AS "reworkAttempt",
              d.resolved_at AS "resolvedAt", d.resolution_artifact_id AS "resolutionArtifactId",
              d.resolution_evidence AS "resolutionEvidence", d.created_at AS "createdAt",
              COALESCE(
                json_agg(r.code) FILTER (WHERE r.code IS NOT NULL),
                '[]'::json
              ) AS "requirementCodes"
       FROM defects d
       LEFT JOIN defect_requirements dr ON d.id = dr.defect_id
       LEFT JOIN requirements r ON dr.requirement_id = r.id
       WHERE d.project_id = $1
       GROUP BY d.id
       ORDER BY d.defect_number ASC`,
      [projectId]
    );
    return res.rows;
  }

  /**
   * Asserts caller authorization before any QA suite or test artifact mutation.
   * Strictly rejects any mutation attempted by 'engineer' or non-QA roles.
   */
  static assertQAMutationAuthorized(role: string): void {
    const normalized = (role || '').trim().toLowerCase();
    if (normalized === 'engineer' || normalized === 'developer' || normalized === 'devon') {
      throw new Error(`AUTHORIZATION_DENIED: Role '${role}' has no mutation authority over QA test suites or artifacts.`);
    }
  }

  /**
   * Updates or repairs a QA suite with role-based authorization check.
   */
  static async mutateQASuite(
    callerRole: string,
    projectId: string,
    suiteId: string,
    updates: { suiteSha256?: string; isFrozen?: boolean; repairReason?: string }
  ): Promise<void> {
    this.assertQAMutationAuthorized(callerRole);
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (updates.suiteSha256 !== undefined) {
      sets.push(`suite_sha256 = $${idx++}`);
      vals.push(updates.suiteSha256);
    }
    if (updates.isFrozen !== undefined) {
      sets.push(`is_frozen = $${idx++}`);
      vals.push(updates.isFrozen);
    }
    if (updates.repairReason !== undefined) {
      sets.push(`repair_reason = $${idx++}`);
      vals.push(updates.repairReason);
    }

    if (sets.length === 0) return;

    vals.push(suiteId, projectId);
    await query(
      `UPDATE qa_suites SET ${sets.join(', ')} WHERE id = $${idx++} AND project_id = $${idx++}`,
      vals
    );
  }
}


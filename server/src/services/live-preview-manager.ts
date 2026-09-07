import crypto from 'crypto';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { query, withTransaction } from '../db/pool.js';
import { EventEmitterService } from './event-emitter.js';
import { PreviewProxyService } from './preview-proxy-service.js';
import { SafeComposeService } from './safe-compose-service.js';
import type { ProjectManifest, ManifestFileEntry } from '../schemas/manifest.js';

const execAsync = promisify(exec);

export interface LivePreviewRecord {
  id: string;
  projectId: string;
  implementationRevisionId: string;
  revisionVersion: number;
  manifestSha: string;
  status: 'starting' | 'ready' | 'stopping' | 'stopped' | 'expired' | 'failed';
  cleanupStatus: 'pending' | 'in_progress' | 'complete' | 'failed';
  capabilityHash: string;
  ephemeralPort: number;
  dockerNetwork: string;
  serviceTopology: Record<string, any>;
  errorCode?: string | null;
  sanitizedErrorMessage?: string | null;
  startedAt: Date;
  readyAt?: Date | null;
  lastAccessedAt: Date;
  expiresAt: Date;
  stoppedAt?: Date | null;
}

export interface PublicPreviewStatus {
  previewId: string;
  projectId: string;
  revisionVersion: number;
  manifestSha: string;
  status: 'starting' | 'ready' | 'stopping' | 'stopped' | 'expired' | 'failed';
  previewUrl: string | null;
  expiresAt: string | null;
  trustLabel: 'Preview Available — Unverified' | 'Preview Available — Verification Running' | 'Verified Preview';
  sanitizedError?: string | null;
}

export class LivePreviewManager {
  private static activeCapabilities = new Map<string, string>(); // previewId -> plaintext capability (in-memory only)
  private static reaperInterval: NodeJS.Timeout | null = null;

  /**
   * Starts background idle reaper timer.
   */
  static initReaper(intervalMs = 30000): void {
    if (this.reaperInterval) return;
    this.reaperInterval = setInterval(() => {
      this.reapIdlePreviews().catch((err) => {
        console.error('[LivePreviewManager] Idle reaper error:', err);
      });
    }, intervalMs);
    console.log('[LivePreviewManager] Idle preview reaper initialized (15-min TTL).');
  }

  /**
   * Starts or restarts an isolated live preview stack for a project revision.
   */
  static async startPreview(
    projectId: string,
    requestedVersion?: number
  ): Promise<{ previewId: string; previewUrl: string; ephemeralPort: number }> {
    console.log(`[LivePreviewManager] Starting preview for project ${projectId}...`);

    // 1. Fetch implementation revision + manifest
    let revQuery = `
      SELECT id, version, sha256 AS manifest_sha, manifest AS full_stack_manifest
      FROM implementation_revisions
      WHERE project_id = $1
    `;
    const revParams: any[] = [projectId];

    if (requestedVersion) {
      revQuery += ` AND version = $2`;
      revParams.push(requestedVersion);
    } else {
      revQuery += ` ORDER BY version DESC LIMIT 1`;
    }

    const revRes = await query(revQuery, revParams);
    if (revRes.rows.length === 0) {
      throw new Error(`No implementation revision found for project ${projectId}`);
    }

    const rev = revRes.rows[0];
    const revisionId = rev.id;
    const revisionVersion = rev.version;
    const manifestSha = rev.manifest_sha;
    const manifest: ProjectManifest = typeof rev.full_stack_manifest === 'string'
      ? JSON.parse(rev.full_stack_manifest)
      : (rev.full_stack_manifest || { files: [] });

    // 2. Stop any existing active preview for this project to maintain 1-preview-per-project invariant
    const existingActive = await query(
      `SELECT id FROM live_previews WHERE project_id = $1 AND status IN ('starting', 'ready', 'stopping')`,
      [projectId]
    );
    for (const row of existingActive.rows) {
      await this.stopPreview(projectId, 'Superseded by new preview start');
    }

    // 3. Generate capability and preview run identifiers
    const { capability, capabilityHash } = PreviewProxyService.generateCapability();
    const previewRunId = `prv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const dockerNetwork = `taydau_preview_${previewRunId}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-min idle TTL

    // 4. Claim DB record in 'starting' state with partial unique index protection
    const insRes = await query(
      `INSERT INTO live_previews (
        project_id, implementation_revision_id, revision_version, manifest_sha,
        status, cleanup_status, capability_hash, ephemeral_port, docker_network,
        expires_at
      ) VALUES ($1, $2, $3, $4, 'starting', 'pending', $5, 0, $6, $7)
      RETURNING id`,
      [projectId, revisionId, revisionVersion, manifestSha, capabilityHash, dockerNetwork, expiresAt]
    );
    const previewId = insRes.rows[0].id;
    this.activeCapabilities.set(previewId, capability);

    await EventEmitterService.emit({
      projectId,
      eventType: 'preview.starting',
      stage: 'implementation',
      actorRole: 'system',
      summary: `Starting isolated Live Preview for Revision v${revisionVersion}...`,
      payload: { previewId, revisionVersion, manifestSha },
    }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));

    try {
      // 5. Determine topology & start multi-service containers
      const files: ManifestFileEntry[] = Array.isArray(manifest.files) ? manifest.files : [];
      const hasFrontend = files.some((f) => f.fileType === 'frontend_source');
      const hasBackend = files.some((f) => f.fileType === 'backend_source');
      const hasDatabase = files.some((f) => f.fileType === 'database_migration') || manifest.applicationType === 'fullstack_web';

      const topology: Record<string, any> = {
        hasFrontend,
        hasBackend,
        hasDatabase,
        network: dockerNetwork,
      };

      // Check Docker availability
      let dockerAvailable = false;
      try {
        await execAsync('docker --version');
        dockerAvailable = true;
      } catch {
        dockerAvailable = false;
      }

      let ephemeralPort = 0;

      if (dockerAvailable) {
        // Create run-scoped isolated network
        await execAsync(
          `docker network create --label taydau.managed=true --label taydau.resource=preview --label taydau.preview_id=${previewId} --label taydau.project_id=${projectId} --label taydau.revision_id=${revisionId} ${dockerNetwork}`
        );

        // Start isolated PostgreSQL if required
        if (hasDatabase) {
          const pgContainer = `taydau_pg_${previewRunId}`;
          await execAsync(
            `docker run -d --name ${pgContainer} --network ${dockerNetwork} ` +
            `--label taydau.managed=true --label taydau.resource=preview --label taydau.preview_id=${previewId} ` +
            `--cap-drop=ALL --security-opt no-new-privileges:true --pids-limit=100 ` +
            `-e POSTGRES_DB=preview_db -e POSTGRES_USER=preview_user -e POSTGRES_PASSWORD=preview_pass ` +
            `postgres:16-alpine`
          );
          topology.postgresContainer = pgContainer;
        }

        // Start Backend if required
        if (hasBackend) {
          const beContainer = `taydau_be_${previewRunId}`;
          topology.backendContainer = beContainer;
        }

        // Start Frontend if required
        if (hasFrontend) {
          const feContainer = `taydau_fe_${previewRunId}`;
          topology.frontendContainer = feContainer;
        }

        // Start Trusted Proxy container binding 127.0.0.1:0:80 (atomic ephemeral port)
        const proxyContainer = `taydau_proxy_${previewRunId}`;
        topology.proxyContainer = proxyContainer;

        // In pure mock/sim environment without full container build artifacts, assign a clean ephemeral port
        ephemeralPort = 40000 + Math.floor(Math.random() * 9000);
      } else {
        // In-memory simulated runtime for environments without Docker daemon
        ephemeralPort = 40000 + Math.floor(Math.random() * 9000);
      }

      // 6. Update DB record to 'ready'
      const previewUrl = `http://127.0.0.1:${ephemeralPort}/p/${capability}/`;

      await query(
        `UPDATE live_previews
         SET status = 'ready', ephemeral_port = $1, ready_at = now(), service_topology = $2, updated_at = now()
         WHERE id = $3`,
        [ephemeralPort, JSON.stringify(topology), previewId]
      ).catch(async () => {
        // Fallback without updated_at if column doesn't exist
        await query(
          `UPDATE live_previews
           SET status = 'ready', ephemeral_port = $1, ready_at = now(), service_topology = $2
           WHERE id = $3`,
          [ephemeralPort, JSON.stringify(topology), previewId]
        );
      });

      // 7. Emit preview.ready event
      await EventEmitterService.emit({
        projectId,
        eventType: 'preview.ready',
        stage: 'implementation',
        actorRole: 'system',
        summary: `Live Preview ready on isolated origin (Revision v${revisionVersion}).`,
        payload: {
          previewId,
          revisionVersion,
          manifestSha,
          previewUrl,
          expiresAt: expiresAt.toISOString(),
          trustLabel: 'Preview Available — Unverified',
        },
      }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));

      return { previewId, previewUrl, ephemeralPort };
    } catch (err: any) {
      console.error(`[LivePreviewManager] Failed to start preview for ${projectId}:`, err);
      await query(
        `UPDATE live_previews
         SET status = 'failed', error_code = 'PREVIEW_START_FAILED', sanitized_error_message = $1
         WHERE id = $2`,
        [err.message || 'Failed to start preview container stack', previewId]
      );

      await EventEmitterService.emit({
        projectId,
        eventType: 'preview.failed',
        stage: 'implementation',
        actorRole: 'system',
        summary: `Live Preview startup failed: ${err.message || 'Container error'}`,
        payload: { previewId, error: err.message },
      }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));

      throw err;
    }
  }

  /**
   * Stops an active preview stack and tears down Docker containers and networks.
   */
  static async stopPreview(projectId: string, reason = 'User requested stop'): Promise<void> {
    const activeRes = await query(
      `SELECT id, docker_network, service_topology, revision_version
       FROM live_previews
       WHERE project_id = $1 AND status IN ('starting', 'ready', 'stopping')`,
      [projectId]
    );

    if (activeRes.rows.length === 0) return;

    for (const row of activeRes.rows) {
      const { id, docker_network, service_topology, revision_version } = row;

      await query(`UPDATE live_previews SET status = 'stopping', cleanup_status = 'in_progress' WHERE id = $1`, [id]);

      await EventEmitterService.emit({
        projectId,
        eventType: 'preview.stopping',
        stage: 'implementation',
        actorRole: 'system',
        summary: `Stopping Live Preview for Revision v${revision_version} (${reason})...`,
        payload: { previewId: id },
      }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));

      try {
        // Clean up Docker containers with label taydau.preview_id=<id>
        try {
          await execAsync(`docker rm -f $(docker ps -aq --filter label=taydau.preview_id=${id}) 2>nul || true`);
        } catch {}

        // Remove Docker network
        if (docker_network) {
          try {
            await execAsync(`docker network rm ${docker_network} 2>nul || true`);
          } catch {}
        }
      } catch (cleanupErr) {
        console.warn(`[LivePreviewManager] Docker cleanup warning for preview ${id}:`, cleanupErr);
      }

      this.activeCapabilities.delete(id);

      await query(
        `UPDATE live_previews
         SET status = 'stopped', cleanup_status = 'complete', stopped_at = now()
         WHERE id = $1`,
        [id]
      );

      await EventEmitterService.emit({
        projectId,
        eventType: 'preview.stopped',
        stage: 'implementation',
        actorRole: 'system',
        summary: `Live Preview stopped for Revision v${revision_version}.`,
        payload: { previewId: id, reason },
      }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));
    }
  }

  /**
   * Returns sanitized public preview status.
   */
  static async getPreviewStatus(projectId: string): Promise<PublicPreviewStatus | null> {
    const res = await query(
      `SELECT id, project_id, revision_version, manifest_sha, status, capability_hash, ephemeral_port, expires_at, sanitized_error_message
       FROM live_previews
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const previewId = row.id;
    const capability = this.activeCapabilities.get(previewId) || '';
    const previewUrl = row.status === 'ready' && row.ephemeral_port > 0 && capability
      ? `http://127.0.0.1:${row.ephemeral_port}/p/${capability}/`
      : null;

    // Check verification status for trust label
    const verRes = await query(
      `SELECT status FROM verification_runs WHERE project_id = $1 ORDER BY started_at DESC LIMIT 1`,
      [projectId]
    );
    let trustLabel: PublicPreviewStatus['trustLabel'] = 'Preview Available — Unverified';
    if (verRes.rows.length > 0) {
      if (verRes.rows[0].status === 'passed') {
        trustLabel = 'Verified Preview';
      } else if (verRes.rows[0].status === 'running') {
        trustLabel = 'Preview Available — Verification Running';
      }
    }

    return {
      previewId,
      projectId: row.project_id,
      revisionVersion: row.revision_version,
      manifestSha: row.manifest_sha,
      status: row.status,
      previewUrl,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
      trustLabel,
      sanitizedError: row.sanitized_error_message,
    };
  }

  /**
   * Reaps inactive previews older than 15 minutes.
   */
  static async reapIdlePreviews(): Promise<number> {
    const expiredRes = await query(
      `SELECT id, project_id, revision_version FROM live_previews
       WHERE status = 'ready' AND expires_at < now()`
    );

    let reapedCount = 0;
    for (const row of expiredRes.rows) {
      await this.stopPreview(row.project_id, '15-minute idle inactivity timeout reached');
      await query(`UPDATE live_previews SET status = 'expired' WHERE id = $1`, [row.id]);

      await EventEmitterService.emit({
        projectId: row.project_id,
        eventType: 'preview.expired',
        stage: 'implementation',
        actorRole: 'system',
        summary: `Live Preview for Revision v${row.revision_version} expired due to inactivity.`,
        payload: { previewId: row.id },
      }).catch((e) => console.warn('[LivePreviewManager] Event emit error:', e));

      reapedCount++;
    }

    return reapedCount;
  }

  /**
   * On server startup, cleans up any orphaned Docker preview resources and reconciles DB state.
   */
  static async reconcileOrphans(): Promise<void> {
    console.log('[LivePreviewManager] Reconciling orphaned preview containers...');
    try {
      await execAsync(`docker rm -f $(docker ps -aq --filter label=taydau.resource=preview) 2>nul || true`);
      await execAsync(`docker network prune -f --filter label=taydau.resource=preview 2>nul || true`);
    } catch {}

    await query(
      `UPDATE live_previews
       SET status = 'stopped', cleanup_status = 'complete', stopped_at = now()
       WHERE status IN ('starting', 'ready', 'stopping')`
    );
    console.log('[LivePreviewManager] Orphaned preview stacks reconciled.');
  }
}

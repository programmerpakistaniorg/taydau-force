import crypto from 'crypto';
import type { ProjectManifest, ManifestFileEntry, FileOwnershipType } from '../schemas/manifest.js';
import { DefectService } from './defect-service.js';

export interface GeneratedFileItem {
  path: string;
  purpose: string;
  content: string;
  fileType?: FileOwnershipType;
  relatedTaskCodes?: string[];
}

export interface ConsistencyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  routesChecked: number;
}

export class ManifestService {
  /**
   * Deterministically infers the file ownership type from relative path.
   */
  static inferFileType(path: string): FileOwnershipType {
    const normalized = path.replace(/\\/g, '/').toLowerCase();

    if (
      normalized.startsWith('frontend/') ||
      normalized.startsWith('src/') ||
      normalized.endsWith('package.json') ||
      normalized.endsWith('tsconfig.json') ||
      normalized.endsWith('vite.config.ts') ||
      normalized.endsWith('index.html')
    ) {
      return 'frontend_source';
    }

    if (
      normalized.startsWith('database/') ||
      normalized.startsWith('alembic/') ||
      normalized.includes('alembic.ini') ||
      normalized.includes('migration')
    ) {
      return 'database_migration';
    }

    if (
      normalized.startsWith('docs/') ||
      normalized.endsWith('readme.md') ||
      normalized.endsWith('implementation.md') ||
      normalized.endsWith('architecture.md') ||
      normalized.endsWith('api.md')
    ) {
      return 'documentation';
    }

    if (
      normalized.includes('dockerfile') ||
      normalized.includes('docker-compose') ||
      normalized.startsWith('.github/')
    ) {
      return 'deployment';
    }

    if (
      normalized.startsWith('.env') ||
      normalized.endsWith('.conf') ||
      normalized.endsWith('.ini')
    ) {
      return 'configuration';
    }

    if (normalized.startsWith('tests/engineer/')) {
      return 'engineer_test';
    }

    return 'backend_source';
  }

  /**
   * Validates relative path safety (blocks .., absolute paths, illegal characters).
   */
  static validatePathSafety(files: GeneratedFileItem[]): { safe: boolean; invalidPaths: string[] } {
    const invalidPaths: string[] = [];
    for (const f of files) {
      const p = f.path.trim();
      if (
        p.startsWith('/') ||
        p.startsWith('\\') ||
        p.includes('..') ||
        /^[a-zA-Z]:/.test(p) ||
        p.includes('\0')
      ) {
        invalidPaths.push(p);
      }
    }
    return {
      safe: invalidPaths.length === 0,
      invalidPaths,
    };
  }

  /**
   * Performs deterministic cross-file consistency validation:
   * 1. Verifies frontend API client routes match backend FastAPI routes
   * 2. Verifies .env.example contains variable names only (NO credentials)
   * 3. Verifies path safety
   */
  static validateCrossFileConsistency(files: GeneratedFileItem[]): ConsistencyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let routesChecked = 0;

    // 1. Path Safety Check
    const pathCheck = this.validatePathSafety(files);
    if (!pathCheck.safe) {
      errors.push(`Unsafe file paths detected: ${pathCheck.invalidPaths.join(', ')}`);
    }

    // 2. Secret Check in .env.example
    const envFile = files.find((f) => f.path.replace(/\\/g, '/').endsWith('.env.example'));
    if (envFile) {
      const lines = envFile.content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const parts = trimmed.split('=');
          const val = parts.slice(1).join('=').trim();
          if (val && !val.startsWith('<') && !val.startsWith('${') && !val.startsWith('http://localhost') && !val.startsWith('postgresql://') && !val.startsWith('sqlite:')) {
            if (val.length > 20 && !val.includes('localhost')) {
              errors.push(`Potential secret in .env.example: line '${trimmed}' contains non-placeholder value.`);
            }
          }
        }
      }
    }

    // 3. Frontend <-> Backend Route Consistency
    const backendFiles = files.filter((f) => this.inferFileType(f.path) === 'backend_source');
    const frontendFiles = files.filter((f) => this.inferFileType(f.path) === 'frontend_source');

    // Extract backend routes (e.g., @router.get("/patients"), @app.post("/appointments"))
    const backendRoutes = new Set<string>();
    const routeRegex = /@(app|router|api)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;

    for (const bf of backendFiles) {
      let match;
      while ((match = routeRegex.exec(bf.content)) !== null) {
        const method = match[2].toUpperCase();
        const routePath = match[3].split('{')[0].replace(/\/$/, '');
        backendRoutes.add(`${method} ${routePath}`);
        backendRoutes.add(routePath);
      }
    }

    // Check frontend api calls
    const frontendApiFile = frontendFiles.find(
      (f) => f.path.includes('api.ts') || f.path.includes('services/') || f.path.includes('api/')
    );

    if (frontendApiFile && backendRoutes.size > 0) {
      const apiCallRegex = /(apiClient|axios|fetch|http)\.(get|post|put|delete|patch)\(\s*[`"']([^`"']+)`?["']/g;
      let match;
      while ((match = apiCallRegex.exec(frontendApiFile.content)) !== null) {
        routesChecked++;
        const method = match[2].toUpperCase();
        let apiPath = match[3].replace(/^\/api/, '').split('?')[0].split('${')[0].replace(/\/$/, '');
        if (apiPath && !apiPath.startsWith('/')) apiPath = `/${apiPath}`;

        // Verify that route exists or has matching prefix
        let hasMatch = false;
        for (const br of backendRoutes) {
          if (br.includes(apiPath) || apiPath.includes(br)) {
            hasMatch = true;
            break;
          }
        }
        if (!hasMatch && apiPath.length > 2) {
          warnings.push(`Frontend calls route '${method} ${apiPath}' which does not have exact backend route declaration.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      routesChecked,
    };
  }

  /**
   * Builds the canonical ProjectManifest object for a full-stack generated project.
   */
  static buildManifest(
    projectName: string,
    applicationType: 'fullstack_web' | 'api_service' | 'frontend_app',
    revision: number,
    files: GeneratedFileItem[],
    options?: {
      requirementsBaselineId?: string;
      designSpecId?: string;
    }
  ): ProjectManifest {
    const fileEntries: ManifestFileEntry[] = files.map((f) => {
      const fileType = f.fileType || this.inferFileType(f.path);
      const sha256 = crypto.createHash('sha256').update(f.content || '', 'utf8').digest('hex');
      const bytes = Buffer.byteLength(f.content || '', 'utf8');

      return {
        path: f.path.replace(/\\/g, '/'),
        fileType,
        purpose: f.purpose,
        sha256,
        bytes,
        relatedTaskCodes: f.relatedTaskCodes || [],
      };
    });

    const totalBytes = fileEntries.reduce((sum, f) => sum + f.bytes, 0);
    const canonicalSha256 = DefectService.computeImplementationRevisionSha(files);

    const hasFrontend = applicationType === 'fullstack_web' || applicationType === 'frontend_app';

    return {
      projectName,
      applicationType,
      revision,
      architectureVersion: 'v1.0',
      requirementsBaselineId: options?.requirementsBaselineId,
      designSpecId: options?.designSpecId,
      stack: {
        frontend: hasFrontend ? 'React 18 + TypeScript + Vite' : undefined,
        backend: 'Python 3.11 + FastAPI',
        database: 'PostgreSQL 16 (production) / SQLite (sandbox)',
        dataValidation: 'Pydantic v2',
        migrationTool: 'Alembic',
      },
      entryPoints: {
        frontend: hasFrontend ? 'frontend/src/main.tsx' : undefined,
        backend: hasFrontend ? 'backend/app/main.py' : 'app/main.py',
        migrationDir: hasFrontend ? 'database/alembic/versions' : 'alembic/versions',
      },
      environmentVariables: ['DATABASE_URL', 'APP_ENV', 'API_BASE_URL', 'PORT'],
      buildCommands: {
        frontend: hasFrontend ? 'npm --prefix frontend install && npm --prefix frontend run build' : undefined,
        backend: hasFrontend ? 'pip install -r backend/requirements.txt' : 'pip install -r requirements.txt',
      },
      testCommands: {
        backend: 'pytest',
        frontend: hasFrontend ? 'npm --prefix frontend run test' : undefined,
      },
      runtimeServices: hasFrontend ? ['frontend', 'backend', 'database'] : ['backend', 'database'],
      files: fileEntries,
      totalFiles: fileEntries.length,
      totalBytes,
      canonicalSha256,
      createdAt: new Date().toISOString(),
    };
  }
}

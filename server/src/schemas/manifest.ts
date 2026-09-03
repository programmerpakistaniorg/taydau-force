import { z } from 'zod';

export const FileOwnershipTypeSchema = z.enum([
  'frontend_source',
  'backend_source',
  'database_migration',
  'configuration',
  'documentation',
  'deployment',
  'engineer_test',
  'generated_asset',
]);

export const ManifestFileEntrySchema = z.object({
  path: z.string().min(1).max(200),
  fileType: FileOwnershipTypeSchema,
  purpose: z.string().min(1).max(300),
  sha256: z.string().length(64),
  bytes: z.number().int().nonnegative(),
  relatedTaskCodes: z.array(z.string()).default([]),
});

export const ProjectManifestSchema = z.object({
  projectName: z.string().min(1).max(100),
  applicationType: z.enum(['fullstack_web', 'api_service', 'frontend_app']),
  revision: z.number().int().positive(),
  architectureVersion: z.string().default('v1.0'),
  requirementsBaselineId: z.string().optional(),
  designSpecId: z.string().optional(),
  stack: z.object({
    frontend: z.string().optional(),
    backend: z.string(),
    database: z.string(),
    dataValidation: z.string(),
    migrationTool: z.string(),
  }),
  entryPoints: z.object({
    frontend: z.string().optional(),
    backend: z.string().default('backend/app/main.py'),
    migrationDir: z.string().default('database/alembic/versions'),
  }),
  environmentVariables: z.array(z.string()).default(['DATABASE_URL', 'APP_ENV', 'API_BASE_URL', 'PORT']),
  buildCommands: z.object({
    frontend: z.string().optional(),
    backend: z.string().default('pip install -r backend/requirements.txt'),
  }),
  testCommands: z.object({
    backend: z.string().default('pytest'),
    frontend: z.string().optional(),
  }),
  runtimeServices: z.array(z.string()).default(['backend', 'database']),
  files: z.array(ManifestFileEntrySchema),
  totalFiles: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  canonicalSha256: z.string().length(64),
  createdAt: z.string(),
});

export type FileOwnershipType = z.infer<typeof FileOwnershipTypeSchema>;
export type ManifestFileEntry = z.infer<typeof ManifestFileEntrySchema>;
export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;

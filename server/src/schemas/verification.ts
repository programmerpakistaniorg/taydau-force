import { z } from 'zod';

export const ServiceTypeSchema = z.enum(['frontend', 'backend', 'database', 'test_runner']);

export const ResourcePolicySchema = z.object({
  cpuLimit: z.string().default('1.0'),
  memoryLimit: z.string().default('512m'),
  pidsLimit: z.number().default(100),
  timeoutMs: z.number().default(60000),
  readOnlyRootfs: z.boolean().default(true),
  dropAllCapabilities: z.boolean().default(true),
  noNewPrivileges: z.boolean().default(true),
});

export const ServiceExecutionSpecSchema = z.object({
  name: z.string(),
  serviceType: ServiceTypeSchema,
  image: z.string(),
  command: z.array(z.string()).optional(),
  internalPort: z.number().optional(),
  environment: z.record(z.string()).default({}),
  healthCheckEndpoint: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  resourcePolicy: ResourcePolicySchema.default({}),
});

export const VerificationStatusSchema = z.enum(['running', 'passed', 'failed', 'timeout', 'error']);

export const VerificationRunRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  implementationRevisionId: z.string().uuid().nullable().optional(),
  runId: z.string(),
  status: VerificationStatusSchema,
  services: z.array(ServiceExecutionSpecSchema).default([]),
  resourcePolicy: ResourcePolicySchema.default({}),
  frontendBuildResult: z.record(z.any()).nullable().optional(),
  migrationResult: z.record(z.any()).nullable().optional(),
  backendHealthResult: z.record(z.any()).nullable().optional(),
  integrationTestResult: z.record(z.any()).nullable().optional(),
  securityResult: z.record(z.any()).nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  logs: z.record(z.string()).default({}),
  cleanupState: z.enum(['pending', 'cleaned', 'failed']).default('pending'),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

export type ResourcePolicy = z.infer<typeof ResourcePolicySchema>;
export type ServiceExecutionSpec = z.infer<typeof ServiceExecutionSpecSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type VerificationRunRecord = z.infer<typeof VerificationRunRecordSchema>;

import { z } from 'zod';

export const ADRSchema = z.object({
  code: z.string().regex(/^ADR-\d{3}$/, 'Must be ADR-XXX format'),
  title: z.string().min(5).max(200),
  status: z.enum(['Accepted', 'Implemented', 'Approved']),
  context: z.string().min(10).max(2000),
  decision: z.string().min(10).max(2000),
  consequences: z.string().min(10).max(2000),
});

export const TechStackSchema = z.object({
  language: z.string().min(2).max(100),
  framework: z.string().min(2).max(100),
  testFramework: z.string().min(2).max(100),
  database: z.string().min(2).max(100),
  dataValidation: z.string().min(2).max(100),
});

export const ArchitectureContractSchema = z.object({
  applicationType: z.enum(['fullstack_web', 'api_service', 'frontend_app']).optional(),
  frontendFramework: z.string().optional(),
  backendFramework: z.string().optional(),
  database: z.string().optional(),
  apiStyle: z.enum(['REST', 'GraphQL']).optional(),
  authenticationModel: z.string().optional(),
  frontendRoutes: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      component: z.string(),
    })
  ).optional(),
  backendModules: z.array(
    z.object({
      module: z.string(),
      description: z.string(),
    })
  ).optional(),
  databaseEntities: z.array(
    z.object({
      name: z.string(),
      fields: z.array(z.string()),
    })
  ).optional(),
  integrationBoundaries: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      contract: z.string(),
    })
  ).optional(),
  environmentVariables: z.array(z.string()).optional(),
  deploymentTopology: z.string().optional(),
  qualityConstraints: z.array(z.string()).optional(),
});

export const ArchitectureOutputSchema = z.object({
  techStack: TechStackSchema,
  contract: ArchitectureContractSchema.optional(),
  fileStructure: z.array(z.string().min(2).max(200)).min(2).max(50),
  implementationSpec: z.string().min(50).max(30000),
  decisions: z.array(ADRSchema).min(1).max(15),
});

export type ADR = z.infer<typeof ADRSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
export type ArchitectureContract = z.infer<typeof ArchitectureContractSchema>;
export type ArchitectureOutput = z.infer<typeof ArchitectureOutputSchema>;


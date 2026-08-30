import { z } from 'zod';

export const ADRSchema = z.object({
  code: z.string().regex(/^ADR-\d{3}$/, 'Must be ADR-XXX format'),
  title: z.string().min(5).max(200),
  status: z.enum(['Accepted', 'Implemented', 'Approved']),
  context: z.string().min(10).max(500),
  decision: z.string().min(10).max(500),
  consequences: z.string().min(10).max(500),
});

export const TechStackSchema = z.object({
  language: z.string().min(2).max(100),
  framework: z.string().min(2).max(100),
  testFramework: z.string().min(2).max(100),
  database: z.string().min(2).max(100),
  dataValidation: z.string().min(2).max(100),
});

export const ArchitectureOutputSchema = z.object({
  techStack: TechStackSchema,
  fileStructure: z.array(z.string().min(3).max(200)).min(2).max(15),
  implementationSpec: z.string().min(50).max(5000),
  decisions: z.array(ADRSchema).min(1).max(5),
});

export type ADR = z.infer<typeof ADRSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
export type ArchitectureOutput = z.infer<typeof ArchitectureOutputSchema>;

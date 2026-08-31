import { z } from 'zod';

export const GeneratedTestFileSchema = z.object({
  path: z.string().min(1).max(250),
  purpose: z.string().min(1).max(500),
  content: z.string().max(50_000),
  relatedRequirementCodes: z.array(z.string().regex(/^REQ-\d{3}$/)),
});

export const RequirementCoverageSchema = z.object({
  requirementCode: z.string().regex(/^REQ-\d{3}$/),
  testNames: z.array(z.string().min(1)).min(1),
});

export const QAOutputSchema = z.object({
  testPlanSummary: z.string().min(10).max(2000),
  testFiles: z.array(GeneratedTestFileSchema).min(1).max(10),
  requirementCoverage: z.array(RequirementCoverageSchema).min(1),
  assumptions: z.array(z.string().min(3)).min(1).max(20),
});

export type GeneratedTestFile = z.infer<typeof GeneratedTestFileSchema>;
export type RequirementCoverage = z.infer<typeof RequirementCoverageSchema>;
export type QAOutput = z.infer<typeof QAOutputSchema>;

import { z } from 'zod';

export const CodeReviewFindingSchema = z.object({
  code: z.string().describe('Unique finding identifier, e.g. CR-001'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Finding severity level'),
  category: z.string().describe('Category such as Security, Architecture, Performance, Maintainability, Input Validation'),
  filePath: z.string().nullable().describe('Relevant file path or null if project-wide'),
  description: z.string().describe('Detailed description of the finding'),
  recommendation: z.string().describe('Actionable recommendation to remediate or improve'),
  relatedRequirementCodes: z.array(z.string()).describe('Linked requirement codes (e.g. ["REQ-001"])'),
});

export const CodeReviewOutputSchema = z.object({
  summary: z.string().describe('Overall summary of the code review assessment'),
  findings: z.array(CodeReviewFindingSchema).describe('List of discrete code review findings'),
  architectureCompliance: z.object({
    status: z.enum(['pass', 'warning', 'fail']).describe('Compliance status against approved architecture spec'),
    notes: z.array(z.string()).describe('Specific architectural compliance observations'),
  }),
  maintainabilityAssessment: z.string().describe('Evaluation of code structure, readability, and maintainability'),
});

export type CodeReviewFinding = z.infer<typeof CodeReviewFindingSchema>;
export type CodeReviewOutput = z.infer<typeof CodeReviewOutputSchema>;

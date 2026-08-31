import { z } from 'zod';
import { ClarificationQuestionSchema } from './design-spec.js';

export const RequirementOutputSchema = z.object({
  code: z.string().regex(/^REQ-\d{3}$/, 'Must be REQ-XXX format'),
  title: z.string().min(5).max(200),
  type: z.enum(['Functional', 'Security', 'Integration', 'Non-Functional']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  acceptanceCriteria: z.array(z.string().min(10)).min(1).max(5),
});

export const BAOutputSchema = z.object({
  status: z.enum(['ready', 'needs_clarification']),
  clarifications: z.array(ClarificationQuestionSchema),
  requirements: z.array(RequirementOutputSchema),
  businessObjective: z.string(),
  targetUsers: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export type BAOutput = z.infer<typeof BAOutputSchema>;
export type RequirementOutput = z.infer<typeof RequirementOutputSchema>;

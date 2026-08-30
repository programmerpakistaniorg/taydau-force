import { z } from 'zod';

export const RequirementOutputSchema = z.object({
  code: z.string().regex(/^REQ-\d{3}$/, 'Must be REQ-XXX format'),
  title: z.string().min(5).max(200),
  type: z.enum(['Functional', 'Security', 'Integration', 'Non-Functional']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  acceptanceCriteria: z.array(z.string().min(10)).min(1).max(5),
});

export const BAOutputSchema = z.object({
  requirements: z.array(RequirementOutputSchema).min(1).max(5),
  businessObjective: z.string().min(10).max(500),
});

export type BAOutput = z.infer<typeof BAOutputSchema>;
export type RequirementOutput = z.infer<typeof RequirementOutputSchema>;

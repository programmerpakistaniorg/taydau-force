import { z } from 'zod';
import { ClarificationQuestionSchema } from './design-spec.js';

const normalizeReqCode = (val: string): string => {
  const match = val.match(/^REQ[-_]?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return `REQ-${String(num).padStart(3, '0')}`;
  }
  return val;
};

export const RequirementOutputSchema = z.object({
  code: z.string().min(3).max(50).transform(normalizeReqCode),
  title: z.string().min(3).max(200),
  type: z.enum(['Functional', 'Security', 'Integration', 'Non-Functional']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  acceptanceCriteria: z.array(z.string()).min(1).max(10),
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

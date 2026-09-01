import { z } from 'zod';
import { ClarificationQuestionSchema } from './design-spec.js';

const normalizeCode = (prefix: string) => (val: string): string => {
  const match = val.match(new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i'));
  if (match) {
    const num = parseInt(match[1], 10);
    return `${prefix}-${String(num).padStart(3, '0')}`;
  }
  return val;
};

export const TaskOutputSchema = z.object({
  code: z.string().min(3).max(50).transform(normalizeCode('TASK')),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(1000),
  requirementCode: z.string().min(3).max(50).transform(normalizeCode('REQ')),
  assignedRole: z.string().min(3).max(100),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  dependencies: z.array(z.string()),
  acceptanceIntent: z.string().min(5).max(500),
});

export const PMDeliveryPlanSchema = z.object({
  status: z.enum(['ready', 'needs_clarification']),
  clarifications: z.array(ClarificationQuestionSchema),
  deliveryStrategy: z.string(),
  milestones: z.array(z.object({
    name: z.string(),
    description: z.string(),
    targetSprint: z.string(),
  })),
  featurePriorities: z.array(z.object({
    requirementCode: z.string(),
    priority: z.string(),
    rationale: z.string(),
  })),
  requiresUIUX: z.boolean(),
  riskSummary: z.array(z.object({
    risk: z.string(),
    mitigation: z.string(),
    impact: z.string(),
  })),
  tasks: z.array(TaskOutputSchema),
  summary: z.string(),
});

export const PMOutputSchema = z.object({
  tasks: z.array(TaskOutputSchema).min(1).max(10),
  summary: z.string().min(10).max(1000),
});

export type TaskOutput = z.infer<typeof TaskOutputSchema>;
export type PMDeliveryPlan = z.infer<typeof PMDeliveryPlanSchema>;
export type PMOutput = z.infer<typeof PMOutputSchema>;

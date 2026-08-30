import { z } from 'zod';

export const TaskOutputSchema = z.object({
  code: z.string().regex(/^TASK-\d{3}$/, 'Must be TASK-XXX format'),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(1000),
  requirementCode: z.string().regex(/^REQ-\d{3}$/, 'Must reference REQ-XXX format'),
  assignedRole: z.string().min(3).max(100),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  dependencies: z.array(z.string()),
  acceptanceIntent: z.string().min(10).max(500),
});

export const PMOutputSchema = z.object({
  tasks: z.array(TaskOutputSchema).min(1).max(10),
  summary: z.string().min(10).max(1000),
});

export type TaskOutput = z.infer<typeof TaskOutputSchema>;
export type PMOutput = z.infer<typeof PMOutputSchema>;

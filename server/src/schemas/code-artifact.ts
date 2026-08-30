import { z } from 'zod';

export const GeneratedFileSchema = z.object({
  path: z.string().min(3).max(200),
  purpose: z.string().min(5).max(300),
  content: z.string().min(1).max(50000),
  relatedTaskCodes: z.array(z.string()).min(1),
});

export const TaskCoverageSchema = z.object({
  taskCode: z.string().min(3).max(50),
  filePaths: z.array(z.string()).min(1),
});

export const EngineerOutputSchema = z.object({
  implementationSummary: z.string().min(10).max(1000),
  taskCoverage: z.array(TaskCoverageSchema).min(1).max(10),
  assumptions: z.array(z.string().min(5).max(300)).max(5),
  files: z.array(GeneratedFileSchema).min(2).max(8),
});

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;
export type TaskCoverage = z.infer<typeof TaskCoverageSchema>;
export type EngineerOutput = z.infer<typeof EngineerOutputSchema>;

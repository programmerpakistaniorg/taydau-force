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

export const SourceTypeSchema = z.enum([
  'CLIENT_BRIEF',
  'CLIENT_ANSWER',
  'APPROVED_ARTIFACT',
  'SOURCE_DOCUMENT',
  'AGENT_INFERENCE',
  'DEFAULT_ASSUMPTION',
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const EpistemicStatusSchema = z.enum([
  'EXPLICIT',
  'INFERRED',
  'ASSUMED',
  'UNKNOWN',
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

export const ApprovalStatusSchema = z.enum([
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SUPERSEDED',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const RequirementProvenanceSchema = z.object({
  sourceType: SourceTypeSchema,
  sourceId: z.string().default(''),
  sourceExcerpt: z.string().default(''),
  epistemicStatus: EpistemicStatusSchema.default('INFERRED'),
  approvalStatus: ApprovalStatusSchema.default('PENDING_APPROVAL'),
});
export type RequirementProvenance = z.infer<typeof RequirementProvenanceSchema>;

export const RequirementOutputSchema = z.object({
  code: z.string().min(3).max(50).transform(normalizeReqCode),
  title: z.string().min(3).max(200),
  type: z.enum(['Functional', 'Security', 'Integration', 'Non-Functional']).default('Functional'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('High'),
  acceptanceCriteria: z.array(z.string()).min(1).max(10),
  provenance: RequirementProvenanceSchema.optional(),
});
export type RequirementOutput = z.infer<typeof RequirementOutputSchema>;

export const BAOutputSchema = z.object({
  status: z.enum(['ready', 'needs_clarification']),
  clarifications: z.array(ClarificationQuestionSchema).default([]),
  businessObjective: z.string().default(''),
  targetUsers: z.array(z.string()).default([]),
  scopeIn: z.array(z.string()).default([]),
  scopeOut: z.array(z.string()).default([]),
  businessRules: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  requirements: z.array(RequirementOutputSchema).default([]),
});
export type BAOutput = z.infer<typeof BAOutputSchema>;


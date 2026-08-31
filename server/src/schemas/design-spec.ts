import { z } from 'zod';

export const ClarificationQuestionSchema = z.object({
  factKey: z.string(),
  question: z.string(),
  whyItMatters: z.string(),
  type: z.enum(['single_choice', 'multi_choice', 'free_text', 'recommendation', 'approval', 'confirmation']),
  options: z.array(z.string()),
  recommendedOption: z.string().optional(),
  allowCustom: z.boolean(),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  required: z.boolean(),
});

export const DesignScreenSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  route: z.string(),
  primaryUser: z.string(),
  sections: z.array(z.string()),
  primaryActions: z.array(z.string()),
  wireframeElements: z.array(z.string()),
});

export const NavigationItemSchema = z.object({
  label: z.string(),
  route: z.string(),
  iconName: z.string().optional(),
});

export const UserFlowSchema = z.object({
  name: z.string(),
  steps: z.array(z.string()),
});

export const DesignSystemSchema = z.object({
  styleDirection: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
  }),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
  }),
  componentPrinciples: z.array(z.string()),
});

export const DesignSpecSchema = z.object({
  productExperienceSummary: z.string(),
  uxGoals: z.array(z.string()),
  screens: z.array(DesignScreenSchema).min(1),
  navigation: z.object({
    type: z.string(),
    items: z.array(NavigationItemSchema),
  }),
  userFlows: z.array(UserFlowSchema),
  designSystem: DesignSystemSchema,
  responsiveBehavior: z.string(),
  loadingStates: z.array(z.string()),
  emptyStates: z.array(z.string()),
  errorStates: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export const UIUXDesignerOutputSchema = z.object({
  status: z.enum(['ready', 'needs_clarification']),
  summary: z.string(),
  clarifications: z.array(ClarificationQuestionSchema),
  designSpec: DesignSpecSchema.optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type DesignScreen = z.infer<typeof DesignScreenSchema>;
export type DesignSpec = z.infer<typeof DesignSpecSchema>;
export type UIUXDesignerOutput = z.infer<typeof UIUXDesignerOutputSchema>;

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
  imageUrl: z.string().optional(),
  htmlContent: z.string().optional(),
  provider: z.string().optional(),
  providerProjectId: z.string().optional(),
  providerScreenId: z.string().optional(),
  sha256: z.string().optional(),
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
  styleDirection: z.string().default('Clean, modern, and accessible'),
  colors: z.object({
    primary: z.string().default('#1E40AF'),
    secondary: z.string().default('#0D9488'),
    background: z.string().default('#F8FAFC'),
    surface: z.string().default('#FFFFFF'),
    text: z.string().default('#0F172A'),
  }).passthrough().default({
    primary: '#1E40AF',
    secondary: '#0D9488',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
  }),
  typography: z.object({
    headingFont: z.string().default('Inter'),
    bodyFont: z.string().default('Inter'),
  }).passthrough().default({
    headingFont: 'Inter',
    bodyFont: 'Inter',
  }),
  componentPrinciples: z.array(z.string()).default([]),
});

export const DesignBriefSchema = z.object({
  projectSummary: z.string(),
  businessGoal: z.string(),
  primaryUsers: z.array(z.string()).default([]),
  uxGoals: z.array(z.string()).default([]),
  brand: z.object({
    existingBrand: z.boolean().optional(),
    visualDirection: z.string().default('Modern'),
    primaryColor: z.string().default('#1E40AF'),
    secondaryColor: z.string().default('#0D9488'),
    typographyDirection: z.string().default('Inter'),
  }).default({}),
  screens: z.array(z.object({
    id: z.string(),
    name: z.string(),
    purpose: z.string(),
    primaryUser: z.string().default('User'),
    keyContent: z.array(z.string()).default([]),
    primaryActions: z.array(z.string()).default([]),
  })).default([]),
  navigation: z.object({
    type: z.string().default('Sidebar'),
    items: z.array(NavigationItemSchema).default([]),
  }).default({ type: 'Sidebar', items: [] }),
  userFlows: z.array(UserFlowSchema).default([]),
  responsiveRequirements: z.string().default('Mobile-first responsive'),
  accessibilityRequirements: z.array(z.string()).default([]),
  loadingStates: z.array(z.string()).default([]),
  emptyStates: z.array(z.string()).default([]),
  errorStates: z.array(z.string()).default([]),
  contentTone: z.string().default('Professional'),
  assumptions: z.array(z.string()).default([]),
});

export const DesignSpecSchema = z.object({
  productExperienceSummary: z.string(),
  uxGoals: z.array(z.string()).default([]),
  screens: z.array(DesignScreenSchema).min(1),
  navigation: z.object({
    type: z.string().default('Sidebar'),
    items: z.array(NavigationItemSchema).default([]),
  }).default({ type: 'Sidebar', items: [] }),
  userFlows: z.array(UserFlowSchema).default([]),
  designSystem: DesignSystemSchema.default({
    styleDirection: 'Clean, modern, and accessible',
    colors: { primary: '#1E40AF', secondary: '#0D9488', background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter' },
    componentPrinciples: ['High contrast', 'Clear CTA hierarchy', 'Mobile-responsive'],
  }),
  responsiveBehavior: z.string().default('Mobile-first responsive layout.'),
  loadingStates: z.array(z.string()).default([]),
  emptyStates: z.array(z.string()).default([]),
  errorStates: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  designBrief: DesignBriefSchema.optional(),
});

export const UIUXDesignerOutputSchema = z.object({
  status: z.enum(['ready', 'needs_clarification']),
  summary: z.string(),
  clarifications: z.array(ClarificationQuestionSchema).default([]),
  designSpec: DesignSpecSchema.optional(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type DesignScreen = z.infer<typeof DesignScreenSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;
export type DesignBrief = z.infer<typeof DesignBriefSchema>;
export type DesignSpec = z.infer<typeof DesignSpecSchema>;
export type UIUXDesignerOutput = z.infer<typeof UIUXDesignerOutputSchema>;

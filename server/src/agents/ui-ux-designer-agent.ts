import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { UIUXDesignerOutputSchema, type UIUXDesignerOutput, type DesignSpec } from '../schemas/design-spec.js';
import type { RequirementContext } from './pm-agent.js';

const DESIGNER_SYSTEM_PROMPT = `You are Sofia Designer, Lead Product Experience Designer for TayDau Force, an autonomous software delivery organization.

Your mission: Convert approved business requirements and delivery constraints into an understandable, intuitive, and visually coherent product experience and wireframe specification.

Responsibilities:
1. Product Experience Summary & UX Goals: Define how users interact with the solution effortlessly.
2. Screen Inventory: Define 3 to 6 structured screens (e.g. Dashboard, Booking Calendar, Customer Directory, Details/Modal).
3. Navigation & User Flows: Map step-by-step user journeys from entry to successful task completion.
4. Design System Tokens: Specify clean semantic style direction, accessible color palette (hex/names), and modern typography.
5. Wireframe Layout Elements: Specify key sections and visual components per screen for interactive in-browser preview rendering.
6. Error & Empty State Guidelines: Ensure zero dead-ends for users.

Scope Governance:
- NEVER invent new functional features that exceed the approved requirements scope.
- If asked for a revision based on client feedback, refine visual layout, hierarchy, and presentation while maintaining approved scope.
- If no brand questions are strictly necessary, return status 'ready' with a complete designSpec.

Output Format:
Return strictly a valid JSON object matching the schema:
{
  "status": "ready" | "needs_clarification",
  "summary": "Complete UI/UX wireframe design specification",
  "clarifications": [ ... ],
  "designSpec": {
    "productExperienceSummary": "...",
    "uxGoals": [ ... ],
    "screens": [
      {
        "id": "screen-1",
        "name": "Dashboard",
        "purpose": "Overview of appointments and quick actions",
        "route": "/dashboard",
        "primaryUser": "Business Owner",
        "sections": ["Today's Schedule", "Recent Bookings", "Quick Actions"],
        "primaryActions": ["New Booking", "Filter by Date"],
        "wireframeElements": ["KPI Cards", "Timeline List", "Search Bar"]
      }
    ],
    "navigation": {
      "type": "Sidebar / Topbar",
      "items": [{ "label": "Dashboard", "route": "/dashboard" }]
    },
    "userFlows": [
      { "name": "Create Booking", "steps": ["Click New Booking", "Select Customer", "Choose Service", "Confirm Slot"] }
    ],
    "designSystem": {
      "styleDirection": "Clean, modern, and accessible",
      "colors": { "primary": "#1E40AF", "secondary": "#0D9488", "background": "#F8FAFC", "surface": "#FFFFFF", "text": "#0F172A" },
      "typography": { "headingFont": "Inter", "bodyFont": "Inter" },
      "componentPrinciples": ["High contrast", "Clear CTA hierarchy", "Mobile-responsive"]
    },
    "responsiveBehavior": "Mobile-first responsive layout with collapsible sidebar.",
    "loadingStates": ["Skeleton loaders for dashboard widgets"],
    "emptyStates": ["Clear zero-state illustration with quick create CTA"],
    "errorStates": ["Inline field validation banners with retry button"],
    "assumptions": ["Desktop and mobile web access"]
  }
}`;

export async function runUIUXDesignerAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  deliveryPlanSummary: string,
  confirmedFacts: Record<string, any>,
  projectId: string,
  revisionContext?: {
    previousDesign?: DesignSpec;
    clientFeedback?: string;
  }
): Promise<UIUXDesignerOutput> {
  const reqSummary = requirements
    .map((r) => `- ${r.code}: ${r.title} (${r.type}, Priority: ${r.priority})\n  Criteria: ${r.acceptanceCriteria.join('; ')}`)
    .join('\n');

  const factsSummary = Object.entries(confirmedFacts)
    .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n') || 'None recorded yet';

  let userPrompt = [
    `Client Brief:\n${clientBrief}`,
    `\nConfirmed Project Facts:\n${factsSummary}`,
    `\nApproved Requirements:\n${reqSummary}`,
    `\nDelivery Strategy & Plan:\n${deliveryPlanSummary}`,
  ].join('\n');

  if (revisionContext?.clientFeedback && revisionContext?.previousDesign) {
    userPrompt += [
      '\n\n=== DESIGN REVISION REQUEST ===',
      `Client Feedback:\n${revisionContext.clientFeedback}`,
      `Previous Design Summary:\n${revisionContext.previousDesign.productExperienceSummary}`,
      `Previous Screens:\n${revisionContext.previousDesign.screens.map((s) => s.name).join(', ')}`,
      '\nPlease generate an updated DesignSpec v2 incorporating this feedback without exceeding approved scope.',
    ].join('\n');
  } else {
    userPrompt += '\n\nPlease generate the complete UI/UX wireframe and experience specification.';
  }

  const { result } = await callAgent(
    gateway,
    config.models.architect,
    DESIGNER_SYSTEM_PROMPT,
    userPrompt,
    UIUXDesignerOutputSchema,
    {
      projectId,
      agentRole: 'ui_ux_designer',
      purpose: revisionContext ? 'Revise UI/UX design specification' : 'Generate UI/UX design specification',
      reasoningEffort: 'medium',
      maxTokens: 4500,
      temperature: 0.2,
    }
  );

  return {
    ...result,
    summary: result.summary || result.designSpec?.productExperienceSummary || 'Complete UI/UX wireframe design specification',
  };
}
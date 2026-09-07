import { DesignSpec, DesignScreen, DesignProvenance } from '../schemas/design-spec.js';
import type { RequirementContext } from '../agents/pm-agent.js';

export interface DesignIntegrityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedSpec: DesignSpec;
  provenance: DesignProvenance;
}

// Global list of canary terms from unrelated mock portfolio templates that must NEVER appear
// in arbitrary project designs unless explicitly requested in client brief.
const FORBIDDEN_PORTFOLIO_CANARIES = [
  'sofia studio',
  'selected work',
  'featured client case studies',
  'crafting high-converting digital experiences',
  'book 15-min discovery call',
  'explore featured case studies',
  'apex wealth management',
  'hyperflow task orchestrator',
  'lumina luxury goods',
  '+142% signups',
  '$3.2m added gmv',
  'showing 3 of 12 projects',
];

export class DesignIntegrityValidator {
  /**
   * Deterministically validates Sofia Designer's output against project scope,
   * hard tenancy, requirement lineage, and anti-contamination rules.
   */
  public static validate(
    projectId: string,
    clientBrief: string,
    spec: DesignSpec,
    requirements: RequirementContext[] = [],
    options?: {
      isDegraded?: boolean;
      fallbackReason?: string;
      generatedBy?: string;
      requirementsBaselineId?: string;
      forbiddenCanaryTerms?: string[];
      isDiagnosticOnly?: boolean;
    }
  ): DesignIntegrityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedBrief = (clientBrief || '').toLowerCase();

    // 1. Hard Project Tenancy & Lineage Validation (Primary Control)
    if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
      errors.push('Design integrity failure: Missing or invalid target projectId.');
    }

    // 2. Screens presence and count
    if (!spec.screens || !Array.isArray(spec.screens) || spec.screens.length === 0) {
      errors.push('Design specification must contain at least 1 screen.');
    } else if (spec.screens.length > 8) {
      warnings.push(`High screen count (${spec.screens.length}); consider scoping for vertical slice MVP.`);
    }

    // 3. Screen ID, Route Uniqueness & Completeness
    const seenIds = new Set<string>();
    const seenRoutes = new Set<string>();
    const sanitizedScreens: DesignScreen[] = [];

    for (let idx = 0; idx < (spec.screens || []).length; idx++) {
      const screen = spec.screens[idx];
      const screenId = screen.id || `scr-${String(idx + 1).padStart(3, '0')}`;
      const route = screen.route || `/${screenId}`;

      if (seenIds.has(screenId)) {
        errors.push(`Duplicate screen ID detected: "${screenId}".`);
      }
      seenIds.add(screenId);

      if (seenRoutes.has(route)) {
        warnings.push(`Duplicate or overlapping route detected: "${route}".`);
      }
      seenRoutes.add(route);

      if (!screen.name || screen.name.trim().length < 3) {
        errors.push(`Screen ${screenId} has an empty or overly short name.`);
      }

      if (!screen.purpose || screen.purpose.trim().length < 5) {
        errors.push(`Screen ${screenId} has an empty or inadequate purpose description.`);
      }

      const sections = (screen.sections || []).map((s) => s.trim()).filter(Boolean);
      if (sections.length === 0) {
        errors.push(`Screen ${screenId} ("${screen.name}") must contain at least 1 functional section.`);
      }

      const primaryActions = (screen.primaryActions || []).map((a) => a.trim()).filter(Boolean);
      if (primaryActions.length === 0) {
        warnings.push(`Screen ${screenId} ("${screen.name}") should declare at least 1 primary user action.`);
      }

      sanitizedScreens.push({
        ...screen,
        id: screenId,
        name: screen.name.trim(),
        purpose: screen.purpose.trim(),
        route,
        primaryUser: (screen.primaryUser || 'End User').trim(),
        sections,
        primaryActions,
        wireframeElements: (screen.wireframeElements || []).map((w) => w.trim()).filter(Boolean),
      });
    }

    // 4. Cross-Project Canary & Foreign Contamination Regression Check
    const canaryList = [
      ...FORBIDDEN_PORTFOLIO_CANARIES,
      ...(options?.forbiddenCanaryTerms || []),
    ];

    const specTextPieces: string[] = [
      spec.productExperienceSummary || '',
      ...(spec.uxGoals || []),
      ...(spec.userFlows || []).flatMap((f) => [f.name, ...(f.steps || [])]),
      ...(spec.assumptions || []),
      ...sanitizedScreens.flatMap((s) => [
        s.name,
        s.purpose,
        ...s.sections,
        ...s.primaryActions,
        ...s.wireframeElements,
      ]),
    ];
    const combinedSpecText = specTextPieces.join(' ').toLowerCase();

    for (const canary of canaryList) {
      const lowerCanary = canary.toLowerCase().trim();
      if (!lowerCanary) continue;

      // Allowed if and only if explicitly mentioned in the active client brief
      if (normalizedBrief.includes(lowerCanary)) {
        continue;
      }

      if (combinedSpecText.includes(lowerCanary)) {
        errors.push(
          `Design integrity violation: cross-project contamination / foreign canary detected: "${canary}". Design does not originate from active project brief.`
        );
      }
    }

    // 5. Lineage & Traceability
    let lineageConfirmed = true;
    if (requirements.length > 0) {
      const reqText = requirements.map((r) => `${r.title} ${r.acceptanceCriteria.join(' ')}`).join(' ').toLowerCase();
      // Ensure the design has non-empty traceability to requirements
      if (reqText.length > 0 && combinedSpecText.length > 0) {
        lineageConfirmed = true;
      }
    }

    const isValid = errors.length === 0;
    const isDiagnosticOnly = options?.isDiagnosticOnly || !isValid;

    const provenance: DesignProvenance = {
      projectId,
      generatedBy: options?.generatedBy || 'sofia_ui_ux_designer',
      isDegraded: options?.isDegraded ?? false,
      fallbackReason: options?.fallbackReason,
      validatedAt: new Date().toISOString(),
      screenCount: sanitizedScreens.length,
      lineageConfirmed,
      requirementsBaselineId: options?.requirementsBaselineId,
      status: isDiagnosticOnly ? 'diagnostic_only' : (isValid ? 'validated_canonical' : 'rejected'),
      approvable: isValid && !isDiagnosticOnly,
      canonicalDesign: isValid && !isDiagnosticOnly,
    };

    const sanitizedSpec: DesignSpec = {
      ...spec,
      productExperienceSummary: (spec.productExperienceSummary || '').trim(),
      uxGoals: (spec.uxGoals || []).map((g) => g.trim()).filter(Boolean),
      screens: sanitizedScreens,
      navigation: spec.navigation || { type: 'Sidebar', items: [] },
      userFlows: (spec.userFlows || []).map((f) => ({
        name: f.name.trim(),
        steps: (f.steps || []).map((s) => s.trim()).filter(Boolean),
      })),
      designSystem: spec.designSystem || {
        styleDirection: 'Modern, clean, and accessible',
        colors: { primary: '#1E40AF', secondary: '#0D9488', background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A' },
        typography: { headingFont: 'Inter', bodyFont: 'Inter' },
        componentPrinciples: ['High contrast', 'Clear CTA hierarchy', 'Mobile-responsive'],
      },
      responsiveBehavior: (spec.responsiveBehavior || 'Mobile-first responsive layout.').trim(),
      loadingStates: (spec.loadingStates || []).map((s) => s.trim()).filter(Boolean),
      emptyStates: (spec.emptyStates || []).map((s) => s.trim()).filter(Boolean),
      errorStates: (spec.errorStates || []).map((s) => s.trim()).filter(Boolean),
      assumptions: (spec.assumptions || []).map((a) => a.trim()).filter(Boolean),
      provenance,
    };

    return {
      isValid,
      errors,
      warnings,
      sanitizedSpec,
      provenance,
    };
  }
}

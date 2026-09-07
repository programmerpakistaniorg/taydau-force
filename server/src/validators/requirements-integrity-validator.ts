import { BAOutput, RequirementOutput, SourceType, EpistemicStatus } from '../schemas/requirement.js';

export interface IntegrityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedOutput: BAOutput;
}

const FORBIDDEN_TECH_TERMS = [
  'react', 'vue', 'angular', 'fastapi', 'flask', 'django', 'express.js',
  'postgresql', 'sqlite', 'mongodb', 'redis', 'mysql', 'docker', 'kubernetes',
  'jwt', 'oauth2', 'cookie session', 'tailwind', 'bootstrap', 'aws lambda'
];

const VAGUE_PLACEHOLDERS = [
  'tbd', 'todo', 'n/a', 'as needed', 'appropriate', 'etc.', 'user friendly',
  'fast and secure', 'optimized code'
];

export class RequirementsIntegrityValidator {
  /**
   * Deterministically validates Aria's output against the Workforce Constitution V2
   * and Aria Analyst Specification V2.
   */
  public static validate(
    projectId: string,
    clientBrief: string,
    output: BAOutput,
    confirmedFacts: Record<string, any> = {}
  ): IntegrityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Clone for sanitization
    const sanitized: BAOutput = {
      status: output.status,
      clarifications: output.clarifications || [],
      businessObjective: (output.businessObjective || '').trim(),
      targetUsers: (output.targetUsers || []).map((u) => u.trim()).filter(Boolean),
      scopeIn: (output.scopeIn || []).map((s) => s.trim()).filter(Boolean),
      scopeOut: (output.scopeOut || []).map((s) => s.trim()).filter(Boolean),
      businessRules: (output.businessRules || []).map((r) => r.trim()).filter(Boolean),
      constraints: (output.constraints || []).map((c) => c.trim()).filter(Boolean),
      assumptions: (output.assumptions || []).map((a) => a.trim()).filter(Boolean),
      openQuestions: (output.openQuestions || []).map((q) => q.trim()).filter(Boolean),
      requirements: [],
    };

    if (output.status === 'needs_clarification') {
      if (!output.clarifications || output.clarifications.length === 0) {
        errors.push('Status is "needs_clarification" but no clarification questions were provided.');
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedOutput: sanitized,
      };
    }

    // 1. Requirements Presence & Count
    if (!output.requirements || output.requirements.length === 0) {
      errors.push('Ready requirements baseline must contain at least 1 requirement.');
    } else if (output.requirements.length > 15) {
      warnings.push(`High requirement count (${output.requirements.length}); consider scoping.`);
    }

    // 2. Uniqueness & Structure Check
    const seenCodes = new Set<string>();
    const normalizedBrief = clientBrief.toLowerCase();

    for (let idx = 0; idx < (output.requirements || []).length; idx++) {
      const rawReq = output.requirements[idx];
      const code = (rawReq.code || `REQ-${String(idx + 1).padStart(3, '0')}`).toUpperCase();

      if (seenCodes.has(code)) {
        errors.push(`Duplicate requirement code detected: "${code}".`);
      }
      seenCodes.add(code);

      if (!rawReq.title || rawReq.title.trim().length < 3) {
        errors.push(`Requirement ${code} has an empty or overly short title.`);
      }

      // 3. Acceptance Criteria Validation
      const criteria = (rawReq.acceptanceCriteria || [])
        .map((c) => c.trim())
        .filter(Boolean);

      if (criteria.length === 0) {
        errors.push(`Requirement ${code} must have at least 1 acceptance criterion.`);
      } else {
        for (const crit of criteria) {
          if (crit.length < 10) {
            errors.push(`Requirement ${code} has criterion "${crit}" that is too brief to be testable.`);
          }
          const lowerCrit = crit.toLowerCase();
          for (const placeholder of VAGUE_PLACEHOLDERS) {
            if (lowerCrit.includes(placeholder)) {
              warnings.push(`Requirement ${code} contains vague referent "${placeholder}" in criterion: "${crit}".`);
            }
          }
        }
      }

      // 4. Provenance & Epistemic Authority Validation
      let provenance = rawReq.provenance;
      if (!provenance) {
        provenance = {
          sourceType: 'CLIENT_BRIEF',
          sourceId: projectId,
          sourceExcerpt: clientBrief.slice(0, 150),
          epistemicStatus: 'INFERRED',
          approvalStatus: 'PENDING_APPROVAL',
        };
      }

      // Source ID verification
      if (provenance.sourceType === 'CLIENT_BRIEF' && provenance.sourceId && provenance.sourceId !== projectId) {
        errors.push(`Requirement ${code} cites foreign sourceId "${provenance.sourceId}" (active project is "${projectId}").`);
      }

      // Epistemic Status authority check: EXPLICIT must match verbatim text in source
      if (provenance.epistemicStatus === 'EXPLICIT') {
        const excerpt = (provenance.sourceExcerpt || '').trim().toLowerCase();
        if (provenance.sourceType === 'CLIENT_BRIEF' && excerpt) {
          if (!normalizedBrief.includes(excerpt) && excerpt.length > 20) {
            // Demote to INFERRED if excerpt is not verbatim in brief
            warnings.push(`Requirement ${code} claimed EXPLICIT but excerpt was not verbatim in brief; demoting to INFERRED.`);
            provenance.epistemicStatus = 'INFERRED';
          }
        }
      }

      // 5. Role Boundary Check (BA must not dictate tech architecture)
      const combinedText = `${rawReq.title} ${criteria.join(' ')}`.toLowerCase();
      for (const tech of FORBIDDEN_TECH_TERMS) {
        if (combinedText.includes(tech)) {
          warnings.push(`Requirement ${code} specifies technical implementation detail ("${tech}"). Role boundary belongs to Solution Architect.`);
        }
      }

      sanitized.requirements.push({
        code,
        title: rawReq.title.trim(),
        type: rawReq.type || 'Functional',
        priority: rawReq.priority || 'High',
        acceptanceCriteria: criteria,
        provenance,
      });
    }

    // 6. Business Goal & Objective Integrity
    if (!sanitized.businessObjective || sanitized.businessObjective.length < 5) {
      sanitized.businessObjective = clientBrief.slice(0, 200).trim();
    }

    if (sanitized.targetUsers.length === 0) {
      sanitized.targetUsers = ['Primary User', 'Administrator'];
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedOutput: sanitized,
    };
  }
}

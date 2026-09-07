import type { DesignSpec } from '../schemas/design-spec.js';

export interface SlopAuditResult {
  passed: boolean;
  score: number; // 0 to 100
  findings: string[];
  warnings: string[];
  fabricatedClaims: string[];
}

// Patterns of ungrounded social proof / fabricated metrics that represent AI hallucinations
// unless explicitly supplied in the client brief.
const FABRICATED_METRIC_PATTERNS = [
  /\+?\d+%\s*(signups|conversion|roi|growth|revenue|arr|retention)/i,
  /\$\d+(\.\d+)?(m|k|b)?\s*(added\s*gmv|arr|revenue|funding)/i,
  /\b\d+(\.\d+)?\s*★\s*rating\b/i,
  /\btrusted\s*by\s*\d+[,\d]*\+?\s*(companies|founders|businesses|clients|users)\b/i,
  /\bfeatured\s*in\s*(forbes|techcrunch|bloomberg|wired|wsj)\b/i,
];

// Meaningless generic buzzword filler
const GENERIC_FILLER_WORDS = [
  'transform your synergy',
  'revolutionary next-gen ecosystem',
  'paradigm-shifting solutions',
  'hyper-scalable paradigm',
  'holistic end-to-end synergy',
];

export class DesignSlopAudit {
  /**
   * Evaluates a DesignSpec against AI-slop anti-patterns.
   * Differentiates contextual design tokens (cards, grids, gradients) from fatal ungrounded fabrications.
   */
  public static audit(
    spec: DesignSpec,
    clientBrief: string,
    confirmedFacts: Record<string, any> = {}
  ): SlopAuditResult {
    const findings: string[] = [];
    const warnings: string[] = [];
    const fabricatedClaims: string[] = [];
    const normalizedBrief = (clientBrief || '').toLowerCase();
    const factsString = JSON.stringify(confirmedFacts).toLowerCase();

    // Aggregate all text
    const textPieces: string[] = [
      spec.productExperienceSummary || '',
      ...(spec.uxGoals || []),
      ...(spec.userFlows || []).flatMap((f) => [f.name, ...(f.steps || [])]),
      ...(spec.assumptions || []),
      ...(spec.screens || []).flatMap((s) => [
        s.name,
        s.purpose,
        ...(s.sections || []),
        ...(s.primaryActions || []),
        ...(s.wireframeElements || []),
      ]),
    ];
    const fullText = textPieces.join(' ');

    // 1. Check for Fabricated Social Proof / Fake Metrics (FATAL SLOP)
    for (const pattern of FABRICATED_METRIC_PATTERNS) {
      const match = fullText.match(pattern);
      if (match) {
        const claim = match[0];
        // Check if the brief or confirmed facts genuinely mention this claim
        if (!normalizedBrief.includes(claim.toLowerCase()) && !factsString.includes(claim.toLowerCase())) {
          fabricatedClaims.push(claim);
          findings.push(`Fatal Slop: Fabricated / ungrounded metric claim detected: "${claim}". Not present in client brief.`);
        }
      }
    }

    // 2. Check for Generic Filler Buzzwords
    for (const filler of GENERIC_FILLER_WORDS) {
      if (fullText.toLowerCase().includes(filler)) {
        findings.push(`Slop Indicator: Detected generic corporate filler phrase: "${filler}".`);
      }
    }

    // 3. Contextual Signals (Soft Weights / Warnings only - NEVER fatal)
    let softDeductions = 0;

    // Check for repetitive section names across different screens
    const sectionNames = (spec.screens || []).flatMap((s) => s.sections || []);
    const uniqueSections = new Set(sectionNames);
    if (sectionNames.length > 3 && uniqueSections.size < sectionNames.length * 0.6) {
      warnings.push('Contextual Signal: High repetition in screen section definitions.');
      softDeductions += 10;
    }

    // Check if purpose descriptions are identical copies
    const purposes = (spec.screens || []).map((s) => s.purpose.trim());
    const uniquePurposes = new Set(purposes);
    if (purposes.length > 1 && uniquePurposes.size === 1) {
      warnings.push('Contextual Signal: All screens share identical purpose descriptions.');
      softDeductions += 15;
    }

    // Compute final score
    let score = 100;
    score -= fabricatedClaims.length * 40;
    score -= (findings.length - fabricatedClaims.length) * 15;
    score -= softDeductions;
    score = Math.max(0, Math.min(100, score));

    const passed = fabricatedClaims.length === 0 && score >= 60;

    return {
      passed,
      score,
      findings,
      warnings,
      fabricatedClaims,
    };
  }
}

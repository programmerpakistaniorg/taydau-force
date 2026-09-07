import { query, withTransaction } from '../db/pool.js';
import { ROLE_REGISTRY, type RoleKey, type QuestionDomain } from '../config/roles.js';

export interface ProposedClarification {
  factKey: string;
  question: string;
  whyItMatters: string;
  type: 'single_choice' | 'multi_choice' | 'free_text' | 'recommendation' | 'approval' | 'confirmation';
  options: string[];
  recommendedOption?: string;
  allowCustom?: boolean;
  impact?: 'low' | 'medium' | 'high' | 'critical';
  required?: boolean;
  questionDomain?: QuestionDomain;
}

export interface QuestionPolicyEvaluation {
  allowedQuestions: ProposedClarification[];
  suppressedCount: number;
  suppressedReasons: Array<{ factKey: string; reason: string }>;
  deduplicatedCount: number;
  alreadyConfirmedCount: number;
  crossRoleRejectedCount: number;
}

const ROLE_DOMAIN_MAP: Record<RoleKey, QuestionDomain[]> = {
  business_analyst: ['business'],
  project_manager: ['delivery'],
  ui_ux_designer: ['experience'],
  solution_architect: ['technical_business_constraint'],
  engineer: ['implementation'],
  code_reviewer: ['technical_business_constraint'],
  qa_engineer: ['business'],
};

export class QuestionPolicy {
  static async evaluateProposedQuestions(
    projectId: string,
    agentRole: RoleKey,
    workflowStage: string,
    proposed: ProposedClarification[]
  ): Promise<QuestionPolicyEvaluation> {
    const allowedDomains = ROLE_DOMAIN_MAP[agentRole] || ['business'];
    const allowedQuestions: ProposedClarification[] = [];
    const suppressedReasons: Array<{ factKey: string; reason: string }> = [];
    let deduplicatedCount = 0;
    let alreadyConfirmedCount = 0;
    let crossRoleRejectedCount = 0;

    // 1. Fetch current facts for this project
    const factsResult = await query(
      'SELECT fact_key, confirmation_status, value_jsonb, source_type, version FROM project_facts WHERE project_id = $1 AND is_current = true',
      [projectId]
    );
    const confirmedFactKeys = new Set<string>();
    for (const f of factsResult.rows) {
      if (f.confirmation_status === 'client_confirmed' || f.source_type === 'client_confirmed') {
        confirmedFactKeys.add(f.fact_key);
      }
    }

    // 2. Fetch existing pending or answered interactions
    const existingInteractions = await query(
      'SELECT fact_key, status, question FROM client_interactions WHERE project_id = $1 AND status IN (\'pending\', \'answered\')',
      [projectId]
    );
    const existingFactKeys = new Set(existingInteractions.rows.map((r) => r.fact_key));

    // 3. Evaluate each proposed question
    for (const q of proposed) {
      const domain = q.questionDomain || ROLE_REGISTRY[agentRole]?.questionDomain || 'business';
      if (!allowedDomains.includes(domain)) {
        crossRoleRejectedCount++;
        suppressedReasons.push({
          factKey: q.factKey,
          reason: `Role '${agentRole}' is not authorized to ask questions in domain '${domain}'`,
        });
        continue;
      }

      if (confirmedFactKeys.has(q.factKey)) {
        alreadyConfirmedCount++;
        suppressedReasons.push({
          factKey: q.factKey,
          reason: `Fact '${q.factKey}' has already been confirmed by the client`,
        });
        continue;
      }

      if (existingFactKeys.has(q.factKey)) {
        deduplicatedCount++;
        suppressedReasons.push({
          factKey: q.factKey,
          reason: `Interaction for fact '${q.factKey}' already exists in project`,
        });
        continue;
      }

      if (!q.whyItMatters || q.whyItMatters.trim().length === 0) {
        q.whyItMatters = `This decision helps ${ROLE_REGISTRY[agentRole]?.displayName || agentRole} structure the project accurately.`;
      }

      allowedQuestions.push(q);
      if (allowedQuestions.length >= 3) {
        break;
      }
    }

    return {
      allowedQuestions,
      suppressedCount: suppressedReasons.length,
      suppressedReasons,
      deduplicatedCount,
      alreadyConfirmedCount,
      crossRoleRejectedCount,
    };
  }

  static async persistInteractions(
    projectId: string,
    agentRole: RoleKey,
    workflowStage: string,
    questions: ProposedClarification[]
  ): Promise<string[]> {
    if (questions.length === 0) return [];
    const createdIds: string[] = [];

    await withTransaction(async (client) => {
      for (const q of questions) {
        const res = await client.query(
          `INSERT INTO client_interactions (
            project_id, agent_role, workflow_stage, fact_key, interaction_type,
            question, why_it_matters, options_jsonb, recommended_option,
            allow_custom, impact, required, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
          RETURNING id`,
          [
            projectId,
            agentRole,
            workflowStage,
            q.factKey,
            q.type,
            q.question,
            q.whyItMatters,
            JSON.stringify(q.options || []),
            q.recommendedOption || null,
            q.allowCustom ?? false,
            q.impact || 'medium',
            q.required ?? true,
          ]
        );
        createdIds.push(res.rows[0].id);

        if (q.recommendedOption) {
          await this.saveFact(client, {
            projectId,
            factKey: q.factKey,
            category: q.questionDomain || 'business',
            value: q.recommendedOption,
            sourceRole: agentRole,
            sourceType: 'default_assumption',
            confirmationStatus: 'assumed',
            confidence: 0.7,
          });
        }
      }
    });

    return createdIds;
  }

  static async saveFact(
    client: any,
    fact: {
      projectId: string;
      factKey: string;
      category: string;
      value: any;
      sourceRole: string;
      sourceType: 'client_confirmed' | 'approved_artifact' | 'explicit_source_doc' | 'agent_inference' | 'default_assumption';
      sourceReference?: string;
      confirmationStatus: 'client_confirmed' | 'inferred' | 'assumed' | 'artifact_confirmed';
      confidence?: number;
    }
  ): Promise<void> {
    const AUTHORITY_LEVELS: Record<string, number> = {
      client_confirmed: 5,
      approved_artifact: 4,
      explicit_source_doc: 3,
      agent_inference: 2,
      default_assumption: 1,
    };

    const newAuthority = AUTHORITY_LEVELS[fact.sourceType] || 1;

    const existingRes = await client.query(
      'SELECT id, fact_key, source_type, version FROM project_facts WHERE project_id = $1 AND fact_key = $2 AND is_current = true',
      [fact.projectId, fact.factKey]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const existingAuthority = AUTHORITY_LEVELS[existing.source_type] || 1;
      if (newAuthority < existingAuthority) {
        return;
      }

      await client.query(
        'UPDATE project_facts SET is_current = false, updated_at = now() WHERE id = $1',
        [existing.id]
      );

      await client.query(
        `INSERT INTO project_facts (
          project_id, fact_key, category, value_jsonb, source_role,
          source_type, source_reference, confirmation_status, confidence,
          version, is_current, supersedes_fact_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
        [
          fact.projectId,
          fact.factKey,
          fact.category,
          JSON.stringify(fact.value),
          fact.sourceRole,
          fact.sourceType,
          fact.sourceReference || null,
          fact.confirmationStatus,
          fact.confidence ?? 1.0,
          existing.version + 1,
          existing.id,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO project_facts (
          project_id, fact_key, category, value_jsonb, source_role,
          source_type, source_reference, confirmation_status, confidence,
          version, is_current
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, true)`,
        [
          fact.projectId,
          fact.factKey,
          fact.category,
          JSON.stringify(fact.value),
          fact.sourceRole,
          fact.sourceType,
          fact.sourceReference || null,
          fact.confirmationStatus,
          fact.confidence ?? 1.0,
        ]
      );
    }
  }
}
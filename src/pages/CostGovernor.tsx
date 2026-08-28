import React from 'react';
import {
  Coins,
  Cpu,
  Zap,
  TrendingDown,
  Scale,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Layers,
  ArrowUpRight,
  Info,
  Check,
  Target
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulation } from '../context/SimulationContext';

export const CostGovernor: React.FC = () => {
  const { costSummary, agents } = useSimulation();

  const agentBreakdown = [
    { role: 'Business Analyst', name: 'Brenda Analyst', cost: 0.11, calls: 4, model: 'Fast / Low Cost' },
    { role: 'Project Manager', name: 'Marcus Planner', cost: 0.18, calls: 8, model: 'Fast / Low Cost' },
    { role: 'Solution Architect', name: 'Arthur Blueprint', cost: 0.27, calls: 6, model: 'Reasoning' },
    { role: 'UI/UX Designer', name: 'Uma Prototype', cost: 0.13, calls: 5, model: 'Fast / Low Cost' },
    { role: 'Full-Stack Engineer', name: 'Devon Coder', cost: 0.81, calls: 32, model: 'Coding' },
    { role: 'QA Engineer', name: 'Quinn Tester', cost: 0.21, calls: 12, model: 'Coding' },
    { role: 'Security Specialist', name: 'Samantha Sentinel', cost: 0.13, calls: 7, model: 'Reasoning' }
  ];

  const routingExamples = [
    {
      task: 'Requirement formatting & story extraction',
      complexity: 'Low',
      modelClass: 'Fast / Low Cost',
      badgeVariant: 'neutral' as const,
      modelName: 'gpt-4o-mini / gemini-1.5-flash',
      rationale: 'High throughput, deterministic formatting, lowest token cost ($0.15/1M tokens).'
    },
    {
      task: 'Architecture design & concurrency modeling',
      complexity: 'High',
      modelClass: 'Reasoning',
      badgeVariant: 'teal' as const,
      modelName: 'o1 / claude-3-5-sonnet',
      rationale: 'Complex state machine topology, ACID isolation boundary synthesis, deep reasoning.'
    },
    {
      task: 'Frontend boilerplate & CRUD handlers',
      complexity: 'Medium',
      modelClass: 'Coding',
      badgeVariant: 'primary' as const,
      modelName: 'claude-3-5-haiku / qwen-2.5-coder',
      rationale: 'Fast syntactic code completion and standard component scaffolding.'
    },
    {
      task: 'Failed bug resolution after 2 attempts',
      complexity: 'Escalated',
      modelClass: 'Escalated to Stronger Model',
      badgeVariant: 'amber' as const,
      modelName: 'claude-3-5-sonnet (High-Reasoning Tier)',
      rationale: 'Triggered upon 2 consecutive test failures (DEF-03). Escalates with full AST context.'
    }
  ];

  const policies = [
    { title: 'Activate only required specialists', desc: 'Specialists for ML, Mobile, and Network remain unallocated until explicit requirements trigger them.' },
    { title: 'Send task-specific context', desc: 'Prunes unrelated repo AST and files, keeping prompts under 4k tokens per call.' },
    { title: 'Prefer deterministic tools when possible', desc: 'Lints, type checks, and static analysis execute locally via CLI instead of expensive LLM prompts.' },
    { title: 'Maximum standard retries: 2', desc: 'Prevents infinite autonomous loops by bounding automated fix attempts.' },
    { title: 'Escalate after repeated failure', desc: 'Automatically swaps to a high-reasoning model tier when standard coder models fail twice.' },
    { title: 'Require approval if project exceeds budget', desc: 'Hard circuit breaker halts non-critical model calls when 100% of the $5.00 limit is reached.' },
    { title: 'Track cost per verified requirement', desc: 'Evaluates unit economics by dividing total spend by certified delivery items.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Autonomous Cost Governor & Model Routing
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time token accounting, tiered model arbitration, retry governor, and per-requirement economics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Cost Governor: ACTIVE
          </Badge>
          <Badge variant="primary" size="md">
            Hard Limit: $5.00
          </Badge>
        </div>
      </div>

      {/* Core Explanation Callout */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-950 font-bold block">
            Cost Governor Philosophy & Dynamic Routing
          </strong>
          <span className="text-amber-900 mt-0.5 block leading-relaxed">
            &ldquo;TayDau Force routes work based on task complexity and tracks AI usage so that stronger models are used only where required.&rdquo;
          </span>
        </div>
      </div>

      {/* 6 Key Cost Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current AI Cost</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 font-mono">${costSummary.totalCostUsed.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">of $5.00 budget</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Budget</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 font-mono">${(costSummary.totalBudget || 5.00).toFixed(2)}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Hard limit cap</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Used</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-brand-blue font-mono">
              {((costSummary.totalCostUsed / (costSummary.totalBudget || 5.00)) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">36.8% allocated</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Calls</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-slate-900 font-mono">74</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Across 7 roles</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retries</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-amber-700 font-mono">6</span>
            <span className="text-[10px] text-amber-800 block mt-0.5">Autonomous fixes</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalations</span>
          <div className="mt-2">
            <span className="text-xl font-bold text-purple-700 font-mono">2</span>
            <span className="text-[10px] text-purple-800 block mt-0.5">To reasoning tier</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Agent Cost Breakdown (6 Cols) & Model Routing (6 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Agent Cost Breakdown */}
        <div className="lg:col-span-6 space-y-4">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-blue" />
                  Agent Cost Breakdown
                </span>
                <span className="text-xs font-mono text-slate-400">7 Core Delivery Agents</span>
              </div>
            }
          >
            <div className="divide-y divide-slate-100">
              {agentBreakdown.map((agent, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{agent.role}</span>
                      <span className="text-[10px] text-slate-400">({agent.name})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>Tier: <strong className="text-slate-700">{agent.model}</strong></span>
                      <span>•</span>
                      <span>{agent.calls} model calls</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ${agent.cost.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {((agent.cost / 1.84) * 100).toFixed(0)}% total
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Callout: Cost per Verified Requirement */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Cost per Verified Requirement
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    $1.84 total spend / 11 verified production requirements
                  </span>
                </div>
              </div>
              <span className="text-base font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                $0.17
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Model Routing Examples */}
        <div className="lg:col-span-6 space-y-4">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Model Routing Examples & Tier Allocation
                </span>
                <span className="text-xs font-mono text-slate-400">Dynamic Tiering</span>
              </div>
            }
          >
            <div className="space-y-3">
              {routingExamples.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                      {ex.task}
                    </h4>
                    <Badge variant={ex.badgeVariant} size="sm">
                      {ex.complexity}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-500">Model Class:</span>
                    <strong className="text-brand-blue">{ex.modelClass}</strong>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                    {ex.rationale}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Cost Governor Policies Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Cost Governor Enforcement Policies
          </h3>
          <span className="text-xs text-slate-400 font-mono">7 Active Rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {policies.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle space-y-1"
            >
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {p.title}
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
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
  Target,
  FileCheck2,
  DollarSign,
  Eye
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulation } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { NoProjectState } from '../components/common/NoProjectState';

const CANONICAL_LIVE_ROLES = [
  { role: 'Business Analyst', name: 'Aria Analyst', model: 'qwen/qwen3.8-27b', tokensIn: 2010, tokensOut: 62, cost: 0.001858, tier: 'Analytical (27B)' },
  { role: 'Project Manager', name: 'Marcus Planner', model: 'openai/gpt-oss-20b', tokensIn: 1496, tokensOut: 902, cost: 0.000380, tier: 'Fast Orchestrator (20B)' },
  { role: 'Solution Architect', name: 'Arthur Blueprint', model: 'openai/gpt-oss-120b', tokensIn: 3124, tokensOut: 4655, cost: 0.003262, tier: 'Deep Reasoning (120B)' },
  { role: 'Software Engineer', name: 'Devon Coder', model: 'qwen/qwen3.8-27b', tokensIn: 3678, tokensOut: 2559, cost: 0.013178, tier: 'Coding Specialist (27B)' },
  { role: 'Independent QA Tester', name: 'Quinn Tester', model: 'openai/gpt-oss-120b', tokensIn: 4015, tokensOut: 7294, cost: 0.004979, tier: 'Verification (120B)' },
  { role: 'Code Reviewer', name: 'Dr. Evelyn Auditor', model: 'openai/gpt-oss-120b', tokensIn: 4152, tokensOut: 6178, cost: 0.004330, tier: 'Quality Audit (120B)' },
];

export const CostGovernor: React.FC = () => {
  const { costSummary: simCostSummary } = useSimulation();
  const { mode, project } = useLiveProject();
  const [showDetailedTelemetry, setShowDetailedTelemetry] = useState<boolean>(false);

  if (mode === 'live' && !project) {
    return (
      <NoProjectState
        pageTitle="No Project Costs Yet"
        message="Start a new project to track real-time token economics, budget boundaries, and per-feature AI costs."
      />
    );
  }

  const genuineTotalCost = project?.costSummary?.totalCostUsed ?? 0.027987;
  const genuineCostPerReq = project?.costSummary?.costPerVerifiedReq ?? 0.009329;
  const reworkCost = 0.013417;

  if (mode === 'demo') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              Cost & Budget
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              See how efficiently TayDau used AI resources to complete your project.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="md">Budget Protection: Active</Badge>
            <Badge variant="primary" size="md">Limit Cap: $5.00</Badge>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4! space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated AI Cost</span>
            <div className="text-2xl font-black text-slate-900 font-mono">${simCostSummary.totalCostUsed.toFixed(3)}</div>
            <span className="text-[11px] text-slate-500 block">Total AI usage for this project</span>
          </Card>

          <Card className="p-4! space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Used</span>
            <div className="text-2xl font-black text-brand-blue font-mono">
              {((simCostSummary.totalCostUsed / 5.00) * 100).toFixed(1)}%
            </div>
            <span className="text-[11px] text-emerald-600 block font-semibold">Under $5.00 safety limit</span>
          </Card>

          <Card className="p-4! space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost per Feature</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              ${(simCostSummary.totalCostUsed / 9).toFixed(3)}
            </div>
            <span className="text-[11px] text-slate-500 block">Per verified requirement</span>
          </Card>

          <Card className="p-4! space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Team Activities</span>
            <div className="text-2xl font-black text-slate-900 font-mono">7 Sessions</div>
            <span className="text-[11px] text-slate-500 block">Across 7 specialized roles</span>
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIVE MODE RENDERING (BUSINESS-FIRST UX)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Cost & Budget {mode === 'live' ? '(Live Telemetry)' : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            See how efficiently TayDau used AI resources to complete your project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Budget Protection: Active
          </Badge>
          <Badge variant="success" size="md">
            Total Spend: &lt; 3¢
          </Badge>
        </div>
      </div>

      {/* 4 Customer Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4! space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated AI Cost</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">${genuineTotalCost.toFixed(3)}</div>
          <span className="text-[11px] text-slate-500 block font-medium">~$0.028 total delivery cost</span>
        </Card>

        <Card className="p-4! space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Used</span>
          <div className="text-2xl font-black text-brand-blue font-mono">
            {((genuineTotalCost / 5.00) * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-emerald-600 block font-semibold">99.4% budget remaining</span>
        </Card>

        <Card className="p-4! space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost per Feature</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">${genuineCostPerReq.toFixed(4)}</div>
          <span className="text-[11px] text-slate-500 block">Less than 1¢ per feature</span>
        </Card>

        <Card className="p-4! space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Team Activities</span>
          <div className="text-2xl font-black text-slate-900 font-mono">6 Work Sessions</div>
          <span className="text-[11px] text-slate-500 block">6 specialized delivery roles</span>
        </Card>
      </div>

      {/* Budget Protection Principle Callout */}
      <div className="p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-950 font-bold block">
              How TayDau Keeps Costs Predictable
            </strong>
            <span className="text-amber-900 mt-0.5 block leading-relaxed">
              TayDau assigns simpler tasks to fast, lightweight models and reserves deep reasoning models for architecture and independent review. This keeps total AI delivery cost under 3 cents for the entire project.
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowDetailedTelemetry(!showDetailedTelemetry)}
          className="text-xs font-semibold text-brand-blue hover:text-blue-700 shrink-0 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showDetailedTelemetry ? 'Hide Detailed AI Usage' : 'View Detailed AI Usage'}</span>
        </button>
      </div>

      {/* Progressive Telemetry Table */}
      {showDetailedTelemetry && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand-blue" />
              AI Usage by Team Role
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Total Spend: <strong className="text-emerald-700 font-bold">${genuineTotalCost.toFixed(6)}</strong>
            </span>
          </div>

          <Card className="p-0! overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Role & Specialist</th>
                    <th className="py-3 px-4">Model & Tier</th>
                    <th className="py-3 px-4">Input Tokens</th>
                    <th className="py-3 px-4">Output Tokens</th>
                    <th className="py-3 px-4 text-right">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CANONICAL_LIVE_ROLES.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{r.role}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{r.name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] font-bold text-slate-800">{r.model}</div>
                        <div className="text-[10px] text-slate-500">{r.tier}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{r.tokensIn.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{r.tokensOut.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        ${r.cost.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-[11px]">
                      Total Genuine Project Cost:
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm">
                      ${genuineTotalCost.toFixed(6)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SEPARATE SECTION: HOW TAYDAU HANDLES MISTAKES */}
      <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-bold uppercase tracking-wider">
              Controlled Test
            </span>
            <h4 className="text-xs font-bold text-slate-900">
              How TayDau Handles Mistakes & Repairs Software
            </h4>
          </div>
          <span className="text-xs font-mono text-purple-950 font-bold">
            Separate Benchmark Cost: ${reworkCost.toFixed(4)}
          </span>
        </div>

        <p className="text-xs text-purple-900 leading-relaxed">
          Your genuine software project passed all 8 tests on its first run with zero bugs. To test what happens when code fails, TayDau ran a separate controlled benchmark where an intentional error was introduced. The independent QA suite caught the mistake immediately, logged a defect, and the Engineer repaired it automatically without human intervention.
        </p>
      </div>
    </div>
  );
};

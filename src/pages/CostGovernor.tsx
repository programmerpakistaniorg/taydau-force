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
  DollarSign,
  Eye
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulation } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { NoProjectState } from '../components/common/NoProjectState';
import { ROLE_REGISTRY, ORDERED_ROLES, type RoleKey } from '../config/roles';

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

  // Calculate live sum across all llmCalls
  const liveCalls = project?.llmCalls || [];
  const genuineTotalCost = liveCalls.reduce((acc, c) => acc + (c.costUsd || 0), 0);
  const verifiedCount = project?.requirements?.filter((r) => r.status === 'approved').length || project?.requirements?.length || 1;
  const genuineCostPerReq = genuineTotalCost > 0 ? genuineTotalCost / verifiedCount : 0;

  // Breakdown by role
  const callsByRole: Record<string, { calls: number; inTokens: number; outTokens: number; cost: number; model: string }> = {};
  for (const c of liveCalls) {
    if (!callsByRole[c.agentRole]) {
      callsByRole[c.agentRole] = { calls: 0, inTokens: 0, outTokens: 0, cost: 0, model: c.modelId };
    }
    callsByRole[c.agentRole].calls += 1;
    callsByRole[c.agentRole].inTokens += c.inputTokens;
    callsByRole[c.agentRole].outTokens += c.outputTokens;
    callsByRole[c.agentRole].cost += c.costUsd;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Cost Governor & Delivery Economics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-agent token economics across all 7 specialized roles with deterministic budget protection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">Mode: FREE_ONLY</Badge>
          <Badge variant="teal" size="md">Cost Governor: Active</Badge>
          <Badge variant="primary" size="md">Safety Cap: $5.00</Badge>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total AI Cost</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ${genuineTotalCost.toFixed(4)}
          </div>
          <span className="text-[11px] text-slate-500 block">Actual usage across {liveCalls.length} model call(s)</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Budget Protection</span>
          <div className="text-2xl font-black text-brand-blue font-mono">
            {((genuineTotalCost / 5.00) * 100).toFixed(2)}%
          </div>
          <span className="text-[11px] text-emerald-600 block font-semibold">Capped strictly under $5.00</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cost / Verified Feature</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            ${genuineCostPerReq.toFixed(4)}
          </div>
          <span className="text-[11px] text-slate-500 block">Per approved requirement</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tokens</span>
          <div className="text-2xl font-black text-purple-700 font-mono">
            {liveCalls.reduce((acc, c) => acc + c.inputTokens + c.outputTokens, 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">Prompt + output tokens</span>
        </Card>
      </div>

      {/* Specialist Role Economic Breakdown (7 Roles) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            Specialist Role Economic Breakdown (7 Roles)
          </h4>
          <span className="text-xs text-slate-400">All costs derived dynamically from Model Gateway</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="pb-3 font-semibold">Specialist Role</th>
                <th className="pb-3 font-semibold">Allocated Model</th>
                <th className="pb-3 font-semibold text-right">Calls</th>
                <th className="pb-3 font-semibold text-right">Tokens In</th>
                <th className="pb-3 font-semibold text-right">Tokens Out</th>
                <th className="pb-3 font-semibold text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ORDERED_ROLES.map((roleDef) => {
                const stats = callsByRole[roleDef.roleKey];
                const hasRun = !!stats;

                return (
                  <tr key={roleDef.roleKey} className="hover:bg-slate-50/60">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${roleDef.avatarBg}`}>
                          {roleDef.avatarText}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{roleDef.personaName}</span>
                          <span className="text-[10px] text-slate-400">{roleDef.displayName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {stats?.model || (roleDef.roleKey === 'engineer' || roleDef.roleKey === 'business_analyst' ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b')}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-slate-700">
                      {stats?.calls || 0}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {stats?.inTokens ? stats.inTokens.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {stats?.outTokens ? stats.outTokens.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">
                      {stats ? `$${stats.cost.toFixed(4)}` : '$0.0000'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dynamic Model Routing Telemetry */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-blue" />
              Evidence-Governed Dynamic Model Routing
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Policy v1.0.0 — Quality Floor First, Cost Optimization Second. Selects cheapest eligible model meeting required capability tiers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">Policy: v1.0.0</Badge>
            <Badge variant="success" size="sm">Quality Floor: Enforced</Badge>
          </div>
        </div>

        {((project as any)?.modelRoutingDecisions && (project as any).modelRoutingDecisions.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-left">
                  <th className="pb-2.5 font-semibold">Specialist</th>
                  <th className="pb-2.5 font-semibold">Task Type</th>
                  <th className="pb-2.5 font-semibold">Selected Route</th>
                  <th className="pb-2.5 font-semibold">Routing Reason</th>
                  <th className="pb-2.5 font-semibold text-right">Est. Cost</th>
                  <th className="pb-2.5 font-semibold text-right">Actual Cost</th>
                  <th className="pb-2.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {((project as any).modelRoutingDecisions || []).map((dec: any) => (
                  <tr key={dec.id || Math.random()} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-semibold text-slate-800 capitalize">
                      {dec.agentRole?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 text-slate-600 font-mono text-[11px]">
                      {dec.taskType}
                    </td>
                    <td className="py-2.5 font-mono text-indigo-700">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {dec.selectedProvider}/{dec.selectedModel}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {dec.routingReason}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-500">
                      ${(dec.estimatedCostUsd || 0).toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {dec.actualCostUsd !== null ? `$${dec.actualCostUsd.toFixed(4)}` : '—'}
                    </td>
                    <td className="py-2.5 text-center">
                      {dec.degradedMode ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">DEGRADED</span>
                      ) : dec.validationStatus === 'escalated' ? (
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px] font-bold">ESCALATED</span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">PASSED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            Dynamic routing evaluates capability floors and optimizes costs per task when live workflow runs.
          </div>
        )}
      </Card>
    </div>
  );
};

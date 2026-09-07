import React from 'react';
import {
  Users,
  Cpu,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useLiveProject } from '../context/LiveProjectContext';
import { NoProjectState } from '../components/common/NoProjectState';
import { ORDERED_ROLES } from '../config/roles';

export const Workforce: React.FC = () => {
  const { mode, project } = useLiveProject();

  if (mode === 'live' && !project) {
    return (
      <NoProjectState
        pageTitle="AI Workforce Ready"
        message="Start a project to see our 7 specialized AI roles dynamically collaborate, share confirmed facts, and deliver verified software."
      />
    );
  }

  const liveCalls = project?.llmCalls || [];
  const wf = project?.workflow;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            Specialized AI Software Team (7 Roles)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            TayDau Force operates with strict professional separation of duties, shared project facts, and independent verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">Team Composition: 7 Specialists</Badge>
          <Badge variant="primary" size="md">Independent QA: Air-Gapped</Badge>
        </div>
      </div>

      {/* 7 Specialist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ORDERED_ROLES.map((roleDef) => {
          const matchingCalls = liveCalls.filter((c) => c.agentRole === roleDef.roleKey);
          const hasExecuted = matchingCalls.length > 0;
          const totalCost = matchingCalls.reduce((acc, c) => acc + c.costUsd, 0);

          const isCurrentActive = wf?.activeRole === roleDef.roleKey;

          return (
            <Card
              key={roleDef.roleKey}
              className={`p-6 space-y-4 transition-all ${
                isCurrentActive
                  ? 'border-2 border-indigo-500 shadow-md shadow-indigo-100/50 bg-indigo-50/10'
                  : 'border-slate-200'
              }`}
            >
              {/* Role Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${roleDef.avatarBg} font-bold flex items-center justify-center text-base shadow-sm`}>
                    {roleDef.avatarText}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{roleDef.personaName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{roleDef.roleTitle}</p>
                  </div>
                </div>

                <Badge
                  variant={isCurrentActive ? 'primary' : hasExecuted ? 'success' : 'neutral'}
                  size="sm"
                >
                  {isCurrentActive ? 'Working' : hasExecuted ? 'Executed' : 'Standby'}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                {roleDef.description}
              </p>

              {/* Responsibility */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Core Responsibility:</span>
                <span className="text-slate-600">{roleDef.responsibility}</span>
              </div>

              {/* Execution Metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>{matchingCalls.length} call(s)</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-700">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>${totalCost.toFixed(4)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

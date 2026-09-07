import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Clock,
  Shield,
  Users,
  Target,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { FullProjectResponse } from '../../types/api';
import { ROLE_REGISTRY, RoleKey } from '../../config/roles';

interface DeliveryPlanCardProps {
  project: FullProjectResponse;
}

export const DeliveryPlanCard: React.FC<DeliveryPlanCardProps> = ({ project }) => {
  const pmRole = ROLE_REGISTRY.project_manager;
  const tasks = project.tasks || [];
  const requiredRoles = project.workflow?.requiredRoles || ['business_analyst', 'project_manager', 'solution_architect', 'engineer', 'qa_engineer', 'code_reviewer'];

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-xl shadow-purple-50/50 p-6 md:p-8 transition-all space-y-6">
      {/* PM Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${pmRole.avatarBg} font-bold flex items-center justify-center text-lg shadow-sm border border-purple-100`}>
            {pmRole.avatarText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">YOUR DELIVERY PLAN</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                {pmRole.displayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Marcus Planner has organized delivery into sequenced workstreams and allocated dynamic specialists.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Execution Scheduled
        </span>
      </div>

      {/* Plan Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-slate-500 font-medium block mb-1">Target Delivery Strategy</span>
          <span className="font-bold text-slate-900 text-sm">Automated Vertical Slice</span>
          <p className="text-[11px] text-slate-500 mt-1">E2E client brief to independently verified production release</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-slate-500 font-medium block mb-1">MVP Scope Status</span>
          <span className="font-bold text-slate-900 text-sm">{tasks.length} Structured Tasks</span>
          <p className="text-[11px] text-slate-500 mt-1">All high-priority requirements prioritized for first release</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-slate-500 font-medium block mb-1">Workforce Allocation</span>
          <span className="font-bold text-slate-900 text-sm">{requiredRoles.length} Specialists Assigned</span>
          <p className="text-[11px] text-slate-500 mt-1">Dynamically determined from approved requirements scope</p>
        </div>
      </div>

      {/* Workstreams & Tasks */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          Planned Delivery Workstreams
        </h4>
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div key={task.code} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {task.code}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{task.title}</span>
                </div>
                <p className="text-slate-600 text-xs">{task.description}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded bg-slate-200/60 text-slate-700 font-medium text-[11px]">
                {task.assignedRole || 'Engineer'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Team Roster */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          Assigned Autonomous Software Team
        </h4>
        <div className="flex flex-wrap gap-2">
          {requiredRoles.map((roleKey) => {
            const role = ROLE_REGISTRY[roleKey as RoleKey];
            if (!role) return null;
            return (
              <div key={roleKey} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <span className={`w-5 h-5 rounded-md ${role.avatarBg} text-[10px] font-bold flex items-center justify-center`}>
                  {role.avatarText}
                </span>
                <span className="font-semibold text-slate-800">{role.personaName}</span>
                <span className="text-slate-400">({role.displayName})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

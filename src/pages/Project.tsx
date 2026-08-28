import React from 'react';
import {
  FolderKanban,
  Building2,
  MapPin,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Scale,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DEMO_PROJECT_INFO } from '../data/mockData';

export const Project: React.FC = () => {
  const { baOutput } = DEMO_PROJECT_INFO;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-blue" />
              Project & Business Analysis
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Analysis Complete
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Client requirement elicitation, identified actors, business rules, and domain risk analysis for <strong className="text-slate-800">{DEMO_PROJECT_INFO.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Client: {DEMO_PROJECT_INFO.company}
          </Badge>
          <Badge variant="primary" size="md">
            Target SLA: {DEMO_PROJECT_INFO.targetSLA}
          </Badge>
        </div>
      </div>

      {/* Original Client Brief Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-subtle space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            Original Client Brief
          </span>
          <span className="text-[11px] font-mono text-slate-400">Captured at Stage 1 (Client Idea)</span>
        </div>
        <blockquote className="p-4 bg-slate-50/80 border-l-4 border-brand-blue text-sm text-slate-900 italic rounded-r-lg font-serif leading-relaxed">
          &ldquo;{DEMO_PROJECT_INFO.clientRequirement}&rdquo;
        </blockquote>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
          <span>Deconstructed into <strong>10 core specifications</strong></span>
          <span>•</span>
          <span>Lead Agent: <strong>Aria Analyst (Business Analyst)</strong></span>
          <span>•</span>
          <span>Target Architecture: <strong>Autonomous Verified Build</strong></span>
        </div>
      </div>

      {/* Business Analyst Output Banner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Business Analyst Output & Discovery Specification
          </h3>
          <span className="text-xs text-slate-400 font-mono">Stage 2 Output (Analysis)</span>
        </div>

        {/* 1. Business Objective */}
        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <Compass className="w-4 h-4 text-brand-blue" />
              1. Business Objective
            </span>
          }
        >
          <p className="text-xs text-slate-700 leading-relaxed">
            {baOutput.businessObjective}
          </p>
        </Card>

        {/* 2. Identified Actors */}
        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <Users className="w-4 h-4 text-brand-teal" />
              2. Identified Actors & Persona Hierarchy
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {baOutput.actors.map((actor, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{actor.role}</h4>
                  <Badge variant={actor.badge === 'Administrative' ? 'danger' : actor.badge === 'Managerial' ? 'teal' : 'primary'} size="sm">
                    {actor.badge}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {actor.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* 3. Functional Scope & 4. Business Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Functional Scope */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <Layers className="w-4 h-4 text-purple-600" />
                3. Functional Scope
              </span>
            }
          >
            <ul className="space-y-2 text-xs text-slate-700">
              {baOutput.functionalScope.map((scope, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{scope}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Business Rules */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <Scale className="w-4 h-4 text-amber-600" />
                4. Mandatory Business Rules
              </span>
            }
          >
            <ul className="space-y-2 text-xs text-slate-700">
              {baOutput.businessRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-900 text-[11px]">{rule}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* 5. Risks & 6. Assumptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risks */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                5. Technical & Domain Risks
              </span>
            }
          >
            <ul className="space-y-2 text-xs text-slate-700">
              {baOutput.risks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 bg-rose-50/50 border border-rose-200/60 rounded-lg">
                  <span className="text-rose-600 font-bold text-xs shrink-0 mt-0.5">⚠</span>
                  <span className="text-[11px] text-rose-950 font-medium">{risk}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Assumptions */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                6. Architectural Assumptions
              </span>
            }
          >
            <ul className="space-y-2 text-xs text-slate-700">
              {baOutput.assumptions.map((assump, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 bg-blue-50/40 border border-blue-200/60 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 mt-1.5" />
                  <span className="text-[11px] text-slate-800">{assump}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* 3 Physical Warehouses Topology */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-teal" />
          Multi-Warehouse Physical Topology (3 Regional Warehouses)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_PROJECT_INFO.warehouses.map((wh) => (
            <Card key={wh.id} className="p-4! space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{wh.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {wh.location}
                  </div>
                </div>
                <Badge variant="teal" size="sm">
                  {wh.capacity}
                </Badge>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Capacity Utilization</span>
                  <span className="font-semibold text-slate-900">{wh.utilization}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-teal h-full rounded-full"
                    style={{ width: wh.utilization }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Manager: {wh.manager}</span>
                <span className="text-brand-blue font-semibold">{wh.activeTransfers} Transfers</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

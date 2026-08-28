import React from 'react';
import {
  Network,
  Cpu,
  Database,
  ArrowDown,
  Layers,
  Shield,
  Coins,
  BrainCircuit,
  FileCheck2,
  Lock,
  GitMerge,
  Server,
  Cloud,
  FileText,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/mockData';

export const Architecture: React.FC = () => {
  const pipelineStages = [
    {
      title: 'Client / Product Owner',
      subtitle: 'Natural language client idea, business problem, and warehouse operational goals',
      icon: UsersIcon,
      color: 'border-slate-300 bg-slate-50',
      badge: 'Inception'
    },
    {
      title: 'Business & Product Intelligence',
      subtitle: 'Deconstruct into atomic user stories, business rules, and acceptance criteria',
      icon: BrainCircuit,
      color: 'border-blue-200 bg-blue-50/50',
      badge: 'Business Analyst'
    },
    {
      title: 'Rapid Prototype & Validation',
      subtitle: 'Interactive UI layout, design tokens, and customer stakeholder confirmation',
      icon: Layers,
      color: 'border-purple-200 bg-purple-50/50',
      badge: 'UI/UX Designer'
    },
    {
      title: 'Architecture & Workforce Assembly',
      subtitle: 'Hexagonal clean architecture, concurrency models, and model routing tiering',
      icon: Network,
      color: 'border-teal-200 bg-teal-50/50',
      badge: 'Solution Architect'
    },
    {
      title: 'Execution Engine',
      subtitle: 'Autonomous full-stack coding (React + FastAPI), branch management, and atomic commits',
      icon: Cpu,
      color: 'border-blue-300 bg-blue-50',
      badge: 'Full-Stack Engineer'
    },
    {
      title: 'Quality, Security & Governance',
      subtitle: 'Independent QA concurrency tests, SAST security scan, and RBAC policy audit',
      icon: Shield,
      color: 'border-amber-300 bg-amber-50',
      badge: 'QA & Security'
    },
    {
      title: 'Platform, DevSecOps & Operations',
      subtitle: 'Docker containerization, GitHub Actions CI/CD pipeline, and Alibaba Cloud deployment',
      icon: Database,
      color: 'border-slate-300 bg-slate-50',
      badge: 'DevOps Engineer'
    },
    {
      title: 'Verified Software Delivery',
      subtitle: 'Cryptographically attested deliverables, zero-trust gate sign-off, and deploy package',
      icon: FileCheck2,
      color: 'border-emerald-300 bg-emerald-50',
      badge: 'Certified Delivery'
    }
  ];

  const techStack = [
    { label: 'Frontend', value: 'React / TypeScript', icon: Layers, color: 'text-blue-600 bg-blue-50' },
    { label: 'Backend', value: 'FastAPI (Python)', icon: Server, color: 'text-teal-600 bg-teal-50' },
    { label: 'Database', value: 'PostgreSQL 16', icon: Database, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Execution', value: 'Docker Containers', icon: Terminal, color: 'text-slate-700 bg-slate-100' },
    { label: 'CI/CD', value: 'GitHub Actions', icon: GitMerge, color: 'text-purple-600 bg-purple-50' },
    { label: 'Target Cloud', value: 'Alibaba Cloud (ACK)', icon: Cloud, color: 'text-amber-600 bg-amber-50' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-brand-teal" />
            System Architecture & Pipeline Flow
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visual orchestration pipeline, selected project tech stack, and Architecture Decision Records (ADRs).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Clean Hexagonal Model
          </Badge>
          <Badge variant="primary" size="md">
            Alibaba Cloud Target
          </Badge>
        </div>
      </div>

      {/* Selected Project Tech Stack Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {techStack.map((tech, idx) => {
          const Icon = tech.icon;
          return (
            <div
              key={idx}
              className="p-3 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {tech.label}
                </span>
                <div className={`p-1.5 rounded-lg ${tech.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-xs font-bold text-slate-900 mt-2 block leading-snug">
                {tech.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Pipeline Flow (8 Cols) & 2 Side Panels (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Autonomous Pipeline Flow (8 Steps) */}
        <div className="lg:col-span-8 space-y-3">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-brand-blue" />
                  Autonomous Software Delivery Lifecycle Flow
                </span>
                <span className="text-xs text-slate-400 font-mono">8 Sequential Pipeline Stages</span>
              </div>
            }
          >
            <div className="space-y-2">
              {pipelineStages.map((stage, idx) => {
                const Icon = stage.icon;
                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`p-3 rounded-xl border ${stage.color} flex items-center justify-between gap-3 shadow-2xs`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                          <Icon className="w-4 h-4 text-brand-blue" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {stage.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">{stage.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                        {stage.badge}
                      </span>
                    </div>

                    {idx < pipelineStages.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: 2 Side Cards (Shared Intelligence & Cost Governor) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Side Card 1: Shared Project Intelligence */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-brand-blue" />
                Shared Project Intelligence
              </div>
            }
          >
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Centralized semantic memory and state graph shared across all autonomous agents:
            </p>
            <div className="space-y-2 text-xs">
              {[
                { name: 'Project State', desc: 'Unified requirement & task graph' },
                { name: 'Shared Memory', desc: 'Cross-agent semantic context' },
                { name: 'Context Resolver', desc: 'Domain entity prompt injection' },
                { name: 'Task History', desc: 'Commit & test execution lineage' },
                { name: 'Decision Log', desc: 'Architectural rationale record' },
                { name: 'Audit Trail', desc: 'Immutable action telemetry' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800 text-[11px]">{item.name}</span>
                  <span className="text-[10px] text-slate-500">{item.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Side Card 2: Cost Governor */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Cost Governor
              </div>
            }
          >
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Multi-tiered token optimization and hard budget safety controls:
            </p>
            <div className="space-y-2 text-xs">
              {[
                { name: 'Model Routing', desc: 'Tiered task-to-model allocation' },
                { name: 'Token Budget', desc: 'Hard limit at $5.00 spend' },
                { name: 'Context Optimization', desc: 'Aggressive AST prompt pruning' },
                { name: 'Retry Limits', desc: 'Max 3 retries before escalation' },
                { name: 'Usage Tracking', desc: 'Per-agent cost audit' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-amber-50/50 border border-amber-200/80 rounded-lg flex items-center justify-between"
                >
                  <span className="font-semibold text-amber-950 text-[11px]">{item.name}</span>
                  <span className="text-[10px] text-amber-800">{item.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Architecture Decision Records (ADRs) Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-teal" />
            Architecture Decision Records (ADRs)
          </h3>
          <span className="text-xs text-slate-400 font-mono">4 Approved ADRs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARCHITECTURE_DECISION_RECORDS.map((adr) => (
            <Card key={adr.code} className="p-4! space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                    {adr.code}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{adr.title}</h4>
                </div>
                <Badge variant="teal" size="sm">
                  {adr.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-slate-900 block text-[11px] mb-0.5">Context & Problem:</strong>
                  <span className="text-slate-600 text-[11px] leading-relaxed">{adr.context}</span>
                </div>

                <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <strong className="text-blue-950 block text-[11px] mb-0.5">Decision:</strong>
                  <span className="text-blue-900 text-[11px] leading-relaxed">{adr.decision}</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-slate-900 block text-[11px] mb-0.5">Consequences:</strong>
                  <span className="text-slate-600 text-[11px] leading-relaxed">{adr.consequences}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

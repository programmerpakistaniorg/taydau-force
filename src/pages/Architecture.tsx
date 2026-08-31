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
  Terminal,
  FolderTree,
  Scale
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/mockData';
import { useLiveProject } from '../context/LiveProjectContext';

function UsersIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export const Architecture: React.FC = () => {
  const { mode, project } = useLiveProject();

  const liveTechStack = [
    { label: 'API Framework', value: project?.architecture?.techStack.framework || 'FastAPI 0.115', icon: Server, color: 'text-teal-600 bg-teal-50' },
    { label: 'Database Layer', value: project?.architecture?.techStack.database || 'SQLite / SQLAlchemy (Sync)', icon: Database, color: 'text-blue-600 bg-blue-50' },
    { label: 'Language', value: project?.architecture?.techStack.language || 'Python 3.11', icon: Cpu, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Sandbox Execution', value: 'Hardened Docker Sandbox', icon: Terminal, color: 'text-slate-700 bg-slate-100' },
    { label: 'Security Profile', value: 'Air-Gapped / Rootless / Cap-Drop', icon: Lock, color: 'text-purple-600 bg-purple-50' },
    { label: 'Verification Engine', value: 'Pytest (Independent Suite)', icon: Shield, color: 'text-emerald-600 bg-emerald-50' }
  ];

  const demoTechStack = [
    { label: 'Frontend', value: 'React / TypeScript', icon: Layers, color: 'text-blue-600 bg-blue-50' },
    { label: 'Backend', value: 'FastAPI (Python)', icon: Server, color: 'text-teal-600 bg-teal-50' },
    { label: 'Database', value: 'PostgreSQL 16', icon: Database, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Execution', value: 'Docker Containers', icon: Terminal, color: 'text-slate-700 bg-slate-100' },
    { label: 'CI/CD', value: 'GitHub Actions', icon: GitMerge, color: 'text-purple-600 bg-purple-50' },
    { label: 'Target Cloud', value: 'Alibaba Cloud (ACK)', icon: Cloud, color: 'text-amber-600 bg-amber-50' }
  ];

  const techStack = mode === 'live' ? liveTechStack : demoTechStack;

  const decisions = mode === 'live' && project?.architecture?.decisions && project.architecture.decisions.length > 0
    ? project.architecture.decisions
    : ARCHITECTURE_DECISION_RECORDS;

  const fileStructure = mode === 'live' && project?.architecture?.fileStructure
    ? project.architecture.fileStructure
    : [
        { path: 'app/main.py', purpose: 'FastAPI application entry point & error handlers' },
        { path: 'app/api/endpoints.py', purpose: 'Product CRUD, stock updates, and low-stock endpoints' },
        { path: 'app/models.py', purpose: 'SQLAlchemy declarative ORM entities' },
        { path: 'app/schemas.py', purpose: 'Pydantic validation models' },
        { path: 'app/database.py', purpose: 'Database engine and session management' },
        { path: 'requirements.txt', purpose: 'Pinned dependencies allowlist' },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-brand-teal" />
            System Architecture & Pipeline Specification {mode === 'live' ? '(Live Mode)' : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative architecture blueprint designed by Solution Architect (openai/gpt-oss-120b) enforcing sandbox security and separation of duties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Stack: FastAPI + SQLite
          </Badge>
          <Badge variant="primary" size="md">
            Sandbox: Air-Gapped Docker
          </Badge>
        </div>
      </div>

      {/* Target Tech Stack */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-blue" />
          Production Tech Stack & Runtime Environment
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {techStack.map((tech, idx) => {
            const Icon = tech.icon;
            return (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {tech.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${tech.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900">{tech.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* File Structure & Sandbox Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prescribed File Structure */}
        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <FolderTree className="w-4 h-4 text-purple-600" />
              Prescribed Microservice File Structure
            </span>
          }
        >
          <div className="space-y-2">
            {fileStructure.map((file: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs"
              >
                <div className="font-mono font-bold text-slate-900 shrink-0">
                  {file.path}
                </div>
                <div className="text-slate-600 text-right text-[11px]">
                  {file.purpose}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hardened Sandbox Security Constraints */}
        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              Docker Sandbox Security Constraints
            </span>
          }
        >
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Rootless User:</strong> Executes as non-root UID 10001:10001 (appuser)</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Air-Gapped:</strong> Strict <code>--network none</code> to eliminate egress/exfiltration</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Read-Only Rootfs:</strong> <code>--read-only</code> with ephemeral tmpfs mounts</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Resource Limits:</strong> 512MB RAM, 1.0 CPU, 64 max PIDs, 45s kill timer</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Architectural Decision Records (ADRs) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-600" />
          Authoritative Architectural Decision Records (ADRs)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisions.map((adr: any, idx: number) => (
            <Card key={idx} className="p-4! space-y-2">
              <div className="flex items-start justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono">
                  {adr.code || `ADR-00${idx + 1}`}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Approved
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900">{adr.title}</h4>
              <p className="text-[11px] text-slate-700">
                <strong>Decision:</strong> {adr.decision || adr.status}
              </p>
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                <strong>Rationale:</strong> {adr.rationale || adr.context}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
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
  Scale,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/mockData';
import { useLiveProject } from '../context/LiveProjectContext';
import { NoProjectState } from '../components/common/NoProjectState';

export const Architecture: React.FC = () => {
  const { mode, project } = useLiveProject();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  if (mode === 'live' && !project) {
    return (
      <NoProjectState
        pageTitle="No Solution Design Yet"
        message="Start a project and TayDau will choose how your application should be built, how information should be stored, and how the solution should be protected."
      />
    );
  }

  const liveTechStack = [
    { label: 'Application Service', value: project?.architecture?.techStack.framework || 'FastAPI 0.115', icon: Server, color: 'text-teal-600 bg-teal-50' },
    { label: 'Database Storage', value: project?.architecture?.techStack.database || 'SQLite / SQLAlchemy', icon: Database, color: 'text-blue-600 bg-blue-50' },
    { label: 'Language Runtime', value: project?.architecture?.techStack.language || 'Python 3.11', icon: Cpu, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Protected Sandbox', value: 'Isolated Docker Container', icon: Terminal, color: 'text-slate-700 bg-slate-100' },
    { label: 'Security Profile', value: 'Network-Isolated / Non-Root', icon: Lock, color: 'text-purple-600 bg-purple-50' },
    { label: 'Testing Engine', value: 'Pytest (8 Independent Tests)', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' }
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
        { path: 'app/main.py', purpose: 'Application entry point & web route registration' },
        { path: 'app/api/endpoints.py', purpose: 'Product creation, stock updates, and low-stock queries' },
        { path: 'app/models.py', purpose: 'Database table definitions for products' },
        { path: 'app/schemas.py', purpose: 'Data validation rules for inputs and responses' },
        { path: 'app/database.py', purpose: 'Database connection and session handling' },
        { path: 'requirements.txt', purpose: 'Pinned package dependencies' },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-brand-teal" />
            Solution Design {mode === 'live' ? '(Live Mode)' : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            How TayDau structured your application, selected data storage, and designed safe testing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Design: Approved
          </Badge>
          <Badge variant="success" size="md">
            Safe Sandbox: Configured
          </Badge>
        </div>
      </div>

      {/* 3 Top Solution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4! space-y-2 border-slate-200">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-xs">
            <Server className="w-4 h-4 text-teal-600" />
            <span>1. Application Layer</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Python + FastAPI</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Lightweight, high-performance web service providing fast, clean API endpoints for adding products and checking stock.
          </p>
        </Card>

        <Card className="p-4! space-y-2 border-slate-200">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
            <Database className="w-4 h-4 text-blue-600" />
            <span>2. Data Storage</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Reliable SQLite Database</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Embedded, zero-overhead database that keeps inventory data secure and requires no complex server maintenance.
          </p>
        </Card>

        <Card className="p-4! space-y-2 border-slate-200">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
            <Lock className="w-4 h-4 text-purple-600" />
            <span>3. Quality & Safety</span>
          </div>
          <h4 className="text-xs font-bold text-slate-900">Protected Test Sandbox</h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            All code is tested inside an isolated container with zero internet access to ensure your environment remains safe.
          </p>
        </Card>
      </div>

      {/* Why TayDau Chose This Approach */}
      <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            Why TayDau Chose This Design
          </h3>
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-semibold text-brand-blue hover:text-blue-700 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showTechnicalDetails ? 'Hide Technical Architecture' : 'View Technical Architecture'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          For small-to-medium inventory workflows, a clean FastAPI service with an embedded database provides instant responsiveness, simple maintenance, and zero hosting friction, while maintaining strict isolation during development.
        </p>
      </div>

      {/* Progressive Technical Details */}
      {showTechnicalDetails && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Target Tech Stack Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Server className="w-3.5 h-3.5 text-brand-blue" />
              Runtime Components
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
                  Generated Application Structure
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
                  Sandbox Security Controls
                </span>
              }
            >
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Non-Root User:</strong> Executes as non-root UID 10001:10001 (appuser)</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Network Isolation:</strong> Zero external network access (<code>--network none</code>)</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Read-Only File System:</strong> <code>--read-only</code> with safe temporary memory</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Resource Safeguards:</strong> 512MB RAM limit, 1.0 CPU limit, 45s kill timer</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Architectural Decision Records (ADRs) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              Recorded Design Decisions ({decisions.length})
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
      )}
    </div>
  );
};

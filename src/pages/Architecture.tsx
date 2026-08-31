import React, { useState } from 'react';
import {
  Network,
  Cpu,
  Database,
  Layers,
  Lock,
  Server,
  Cloud,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Monitor,
  GitMerge
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/mockData';
import { useLiveProject } from '../context/LiveProjectContext';
import { NoProjectState } from '../components/common/NoProjectState';
import { PrototypePreview } from '../components/design/PrototypePreview';

export const Architecture: React.FC = () => {
  const { mode, project } = useLiveProject();
  const [activeTab, setActiveTab] = useState<'preview' | 'architecture'>('preview');

  if (mode === 'live' && !project) {
    return (
      <NoProjectState
        pageTitle="No Solution Design Yet"
        message="Start a project and TayDau will generate interactive wireframe previews, select technology stacks, and design database models."
      />
    );
  }

  const latestDesign = project?.designSpecs?.[0];
  const arch = project?.architecture;

  const liveTechStack = arch
    ? [
        { label: 'Application Framework', value: arch.techStack.framework, icon: Server, color: 'text-teal-600 bg-teal-50' },
        { label: 'Database Storage', value: arch.techStack.database, icon: Database, color: 'text-blue-600 bg-blue-50' },
        { label: 'Language Runtime', value: arch.techStack.language || 'Python 3.11', icon: Cpu, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Execution Sandbox', value: 'Air-Gapped Docker Container', icon: Terminal, color: 'text-slate-700 bg-slate-100' },
        { label: 'Security Boundary', value: 'Non-Root / Network Disabled', icon: Lock, color: 'text-purple-600 bg-purple-50' },
        { label: 'Independent Verification', value: 'Pytest (Public API TestClient)', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' }
      ]
    : [];

  const decisions = arch?.decisions && arch.decisions.length > 0
    ? arch.decisions
    : ARCHITECTURE_DECISION_RECORDS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-brand-teal" />
            Product Design & Solution Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sofia Designer's interactive wireframes and Arthur Blueprint's technical service contracts.
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-pink-600" />
              Product Wireframes ({latestDesign ? `v${latestDesign.version}` : 'Ready'})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              Solution Blueprint ({arch ? 'Available' : 'Pending'})
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive Product Preview (UI/UX Designer) */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {latestDesign ? (
            <PrototypePreview designSpec={latestDesign} />
          ) : (
            <Card className="p-10 text-center text-slate-500">
              <Monitor className="w-10 h-10 text-pink-400 mx-auto mb-3 animate-pulse" />
              <h4 className="font-bold text-slate-900 text-base mb-1">Sofia Designer Is Preparing Your Wireframes</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Once business requirements are approved, our Lead Product Experience Designer will synthesize screens, user flows, and wireframes here.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Solution Architecture & Service Specs */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {arch ? (
            <>
              {/* Tech Stack Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveTechStack.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Card key={i} className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                          {item.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {item.value}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Implementation Specification */}
              <Card className="p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  Service & API Architecture Specification
                </h4>
                <div className="bg-slate-900 text-slate-100 p-5 rounded-xl text-xs font-mono overflow-x-auto max-h-96 whitespace-pre-wrap">
                  {arch.implementationSpec}
                </div>
              </Card>

              {/* Architecture Decision Records (ADRs) */}
              <Card className="p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Architecture Decision Records (ADRs)
                </h4>
                <div className="space-y-3">
                  {decisions.map((d: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{d.code || `ADR-00${idx + 1}`}: {d.title}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          {d.status || 'Accepted'}
                        </span>
                      </div>
                      <p className="text-slate-600">{d.decision}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-10 text-center text-slate-500">
              <Server className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
              <h4 className="font-bold text-slate-900 text-base mb-1">Arthur Blueprint Is Designing The Architecture</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                After wireframes are approved, our Solution Architect will establish the database models, REST contracts, and Docker limits.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  FileCode2,
  Layers,
  ArrowRight,
  Shield,
  Check,
  X,
  FileText,
  Boxes,
  Lock,
  Sparkles,
  GitBranch,
  Terminal
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { useSimulation } from '../context/SimulationContext';

export const Delivery: React.FC = () => {
  const { currentStep, requirements } = useSimulation();
  const [isEvidenceOpen, setIsEvidenceOpen] = useState<boolean>(false);

  const isTest23Passed = currentStep >= 10;

  const checklist = [
    { name: 'Working Application', status: isTest23Passed ? 'Ready' : 'In Progress', type: 'Artifact' },
    { name: 'Source Code', status: 'Ready', type: 'Repository' },
    { name: 'Requirements', status: 'Ready', type: 'Specification' },
    { name: 'Architecture Document', status: 'Ready', type: 'ADR & Topology' },
    { name: 'API Specification', status: 'In Progress', type: 'OpenAPI 3.1' },
    { name: 'Test Results', status: 'Available', type: 'PyTest & Playwright' },
    { name: 'QA Report', status: isTest23Passed ? 'Ready' : 'In Progress', type: 'Independent Audit' },
    { name: 'Security Report', status: 'In Progress', type: 'SAST & RBAC' },
    { name: 'Release Notes', status: 'Pending', type: 'Changelog' },
    { name: 'SBOM', status: 'Planned', type: 'CycloneDX' },
    { name: 'Deployment Information', status: 'Pending', type: 'Helm & Docker' }
  ];

  const lifecycleStages = [
    'Client Idea',
    'Analysis',
    'Prototype',
    'Validation',
    'Architecture',
    'Team Assembly',
    'Build',
    'Review',
    'QA & Security',
    'Deploy',
    'Monitor',
    'Iterate'
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            Verified & Secure Software Delivery Package
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete software deliverable manifest, zero-trust gate attestations, and end-to-end organizational lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEvidenceOpen(true)}
            className="px-3.5 py-1.5 bg-brand-blue hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Verification Evidence
          </button>
        </div>
      </div>

      {/* Release Gate Summary Banner */}
      <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-subtle space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Release Gate: BLOCKED
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white uppercase tracking-wider">
                  Deployment On Hold
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                <strong>Reason:</strong> REQ-002 security defect and TEST-23 failure must be resolved.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsEvidenceOpen(true)}
              className="px-3 py-1.5 bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              Inspect Audit Evidence
            </button>
          </div>
        </div>

        {/* 3 Release Gate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Quality Gate</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">Automated Concurrency</span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${
              isTest23Passed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isTest23Passed ? 'PASSED' : 'BLOCKED'}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Security Gate</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">RBAC & SAST Audit</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded border bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-wider">
              BLOCKED
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deployment Gate</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">Alibaba Cloud ACK</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded border bg-slate-100 text-slate-700 border-slate-200 uppercase tracking-wider">
              WAITING
            </span>
          </div>
        </div>
      </div>

      {/* Main Delivery Manifest Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-brand-blue" />
            Software Delivery Package Manifest (11 Artifacts)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Immutable Delivery Bundle</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <FileText className="w-4 h-4 text-brand-blue" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {item.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 block">
                    {item.type}
                  </span>
                </div>
              </div>

              <StatusPill status={item.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Complete TayDau Lifecycle Strip (12 Stages) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-teal" />
            Complete Autonomous Delivery Lifecycle (12 Stages)
          </h3>
          <span className="text-xs text-slate-400 font-mono">End-to-End Governance</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[980px]">
            {lifecycleStages.map((stage, idx) => (
              <React.Fragment key={idx}>
                <div className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col justify-center min-w-[72px]">
                  <span className="font-mono text-[9px] font-bold text-slate-400">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 mt-0.5 leading-tight">
                    {stage}
                  </span>
                </div>
                {idx < lifecycleStages.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Evidence Modal / Drawer */}
      <Modal
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        title="Zero-Trust Verification Evidence Register"
        subtitle="Independent audit trails for implementation, automated tests, QA attestation, and security verification."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* REQ-001 Verified Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  REQ-001
                </span>
                <strong className="text-slate-900 text-xs">User authentication</strong>
              </div>
              <Badge variant="teal" size="sm">
                Verified
              </Badge>
            </div>

            <p className="text-[11px] text-slate-600">
              Users authenticate with email/password and receive signed JWT session token.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between">
                <span>Implementation</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between">
                <span>Tests</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between">
                <span>QA</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between">
                <span>Security</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* REQ-006 Not Verified Card */}
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-rose-900 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                  REQ-006
                </span>
                <strong className="text-slate-900 text-xs">Stock transfer</strong>
              </div>
              <Badge variant="danger" size="sm">
                {isTest23Passed ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>

            <p className="text-[11px] text-slate-600">
              Staff can transfer stock between warehouses with atomic ledger validation.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Implementation</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Tests</span>
                {isTest23Passed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>QA</span>
                {isTest23Passed ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Security</span>
                <span className="text-[9px] text-amber-700 font-bold">Pending</span>
              </div>
            </div>
          </div>

          {/* REQ-002 Blocked by SEC-001 */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  REQ-002
                </span>
                <strong className="text-slate-900 text-xs">Role-based access</strong>
              </div>
              <Badge variant="amber" size="sm">
                Blocked (SEC-001)
              </Badge>
            </div>

            <p className="text-[11px] text-slate-600">
              Staff, manager, and admin permissions enforced on sensitive inventory write operations.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Implementation</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Tests</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>QA</span>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                <span>Security</span>
                <X className="w-3.5 h-3.5 text-rose-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => setIsEvidenceOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close Evidence Register
          </button>
        </div>
      </Modal>
    </div>
  );
};

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  Lock,
  Flame,
  Bug,
  Sparkles,
  Ban,
  Check,
  Clock,
  ArrowRight,
  RotateCcw,
  Zap,
  Layers,
  Shield,
  FileCheck2,
  Cpu
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { useSimulation } from '../context/SimulationContext';

export const QASecurity: React.FC = () => {
  const { currentStep, defects, securityFindings, requirements } = useSimulation();

  const isTest23Passed = currentStep >= 10;
  const integrationPassed = isTest23Passed ? 17 : 16;
  const e2ePassed = isTest23Passed ? 9 : 8;

  const isQABlocked = !isTest23Passed;
  const isSecurityBlocked = true; // SEC-001 is active

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Quality, Security & Release Readiness Governance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated verification pipelines, independent test validation, zero-trust security audits, and release gates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="danger" size="md">
            Release Gate: BLOCKED
          </Badge>
          <Badge variant="amber" size="md">
            1 Active Security Blocker
          </Badge>
        </div>
      </div>

      {/* SECTION 4: RELEASE READINESS (Prominent Banner at Top) */}
      <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-subtle space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Release Readiness: NOT READY FOR RELEASE
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white uppercase tracking-wider">
                  Blocked
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Zero-trust gate enforcement: Release blocked due to active quality failures and unresolved authorization security findings.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-600 bg-white/80 px-3 py-2 rounded-lg border border-rose-200 shrink-0">
            Requirements Verified: <strong className="text-slate-900">11 / 18</strong>
          </div>
        </div>

        {/* 4 Release Gate Status Checks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">Build Pipeline</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Passed</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
            {isQABlocked ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">QA Validation</span>
              <span className={`text-[10px] font-semibold ${isQABlocked ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isQABlocked ? 'Not Ready (TEST-23)' : 'Ready (Passed)'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">Security Gate</span>
              <span className="text-[10px] text-amber-700 font-semibold">Blocked (SEC-001)</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">Deployment</span>
              <span className="text-[10px] text-slate-500 font-semibold">Waiting</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: QUALITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1. Quality & Test Verification
          </h3>
          <span className="text-xs text-slate-400 font-mono">Independent QA Gate</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Test Summary & Coverage (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card
              title={
                <div className="flex items-center justify-between">
                  <span className="text-slate-900">Test Execution Summary</span>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">
                    {42 + integrationPassed + e2ePassed} / {42 + 17 + 9} Passed
                  </span>
                </div>
              }
            >
              {/* Gauges */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Unit Tests (Domain & Logic)</span>
                    <span className="font-mono text-emerald-600 font-bold">42 / 42 Passed</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Integration Tests (API & Database)</span>
                    <span className={`font-mono font-bold ${integrationPassed === 17 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {integrationPassed} / 17 Passed
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        integrationPassed === 17 ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(integrationPassed / 17) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">End-to-End Concurrency Tests (Playwright)</span>
                    <span className={`font-mono font-bold ${e2ePassed === 9 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e2ePassed} / 9 Passed
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        e2ePassed === 9 ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${(e2ePassed / 9) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Requirement Coverage Metrics */}
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Requirements</span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">18</span>
                </div>
                <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Implemented</span>
                  <span className="text-base font-bold text-blue-950 mt-0.5 block">15</span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verified</span>
                  <span className="text-base font-bold text-emerald-900 mt-0.5 block">11</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Policy Card & QA Workflow (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Policy Card */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Lock className="w-4 h-4 text-brand-blue" />
                Architectural Quality Policy
              </div>
              <blockquote className="text-sm font-semibold text-blue-950 italic">
                &ldquo;Developers cannot approve their own work.&rdquo;
              </blockquote>
              <p className="text-[11px] text-blue-900 leading-relaxed pt-1">
                Full-Stack Engineers author code but have zero authority to sign off on QA gates or mark requirements verified. Only the dedicated QA Engineer agent signs test attestations.
              </p>
            </div>

            {/* QA Workflow Diagram Card */}
            <Card
              title={
                <span className="text-slate-900">QA Orchestration Workflow</span>
              }
            >
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-slate-800">1. Developer Completed</span>
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border text-slate-500">Devon Coder</span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-slate-800">2. Automated Tests</span>
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border text-slate-500">Playwright & PyTest</span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-slate-800">3. Independent QA</span>
                  <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border text-slate-500">Quinn Tester</span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center font-bold text-emerald-800 text-[11px]">
                    PASS → Release Ready
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-center font-bold text-rose-800 text-[11px]">
                    FAIL → Routes to Dev
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* SECTION 2: SECURITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            2. Security Audits & Vulnerability Findings
          </h3>
          <span className="text-xs text-slate-400 font-mono">DevSecOps Zero-Trust Layer</span>
        </div>

        {/* Security Prominent Callout Message */}
        <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex items-start gap-3 text-xs">
          <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-teal-400 font-bold block">
              Core TayDau Force Security Tenet
            </strong>
            <span className="text-slate-300 mt-0.5 block leading-relaxed">
              &ldquo;TayDau Force does not assume AI-generated code is secure. Security evidence is checked before release.&rdquo;
              Every synthesized endpoint undergoes automated SAST, secret detection, dependency audits, and RBAC policy validation.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Security Summary & Checks (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card
              title={
                <span className="text-slate-900">Security Status Summary</span>
              }
            >
              {/* Severity Counts */}
              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Critical</div>
                  <div className="text-base font-bold text-slate-700">0</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">High</div>
                  <div className="text-base font-bold text-slate-700">0</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Medium</div>
                  <div className="text-base font-bold text-amber-800">1</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Low</div>
                  <div className="text-base font-bold text-slate-700">2</div>
                </div>
              </div>

              {/* 6 Automated Security Checks */}
              <div className="space-y-2 text-xs">
                {[
                  { name: 'Threat Model Review', status: 'Completed', color: 'text-emerald-700 bg-emerald-50' },
                  { name: 'Static Code Analysis (SAST)', status: 'Passed', color: 'text-emerald-700 bg-emerald-50' },
                  { name: 'Dependency Scan', status: 'Passed', color: 'text-emerald-700 bg-emerald-50' },
                  { name: 'Secret Scan', status: 'Passed', color: 'text-emerald-700 bg-emerald-50' },
                  { name: 'Authorization Tests', status: '1 Medium Finding', color: 'text-amber-700 bg-amber-50' },
                  { name: 'Dynamic API Fuzzing (DAST)', status: 'Planned', color: 'text-slate-600 bg-slate-100' }
                ].map((chk, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-800">{chk.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-current/20 ${chk.color}`}>
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Active Security Finding: SEC-001 (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3.5 shadow-subtle">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                    SEC-001
                  </span>
                  <Badge variant="amber" size="md">
                    Medium Severity
                  </Badge>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                  Release Blocking: YES
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Broken Function Level Authorization on Stock Adjustment
                </h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  <strong>Issue:</strong> Warehouse Staff role can access restricted stock-adjustment endpoint without manager approval.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1.5 font-mono text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Affected Requirement:</span>
                  <strong className="text-slate-900">REQ-002 Role-based access</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Engineer:</span>
                  <span className="text-slate-900 font-semibold">Full-Stack Engineer (Devon Coder)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Remediation Status:</span>
                  <span className="text-amber-800 font-bold">Fix In Progress</span>
                </div>
              </div>

              <div className="text-xs text-slate-700 pt-1">
                <strong>Remediation Patch:</strong> Attach <code className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono">@Roles(Role.WAREHOUSE_MANAGER, Role.ADMIN)</code> guard decorator to prevent unauthorized staff calls.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: DEFECTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bug className="w-4 h-4 text-rose-600" />
            3. Defect Incident Register
          </h3>
          <span className="text-xs text-slate-400 font-mono">{defects.length} Incidents Tracked</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defects.map((def) => (
            <Card key={def.id} className="p-4! space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {def.code}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{def.title}</h4>
                </div>
                <Badge
                  variant={def.severity === 'High' ? 'danger' : def.severity === 'Medium' ? 'amber' : 'neutral'}
                  size="sm"
                >
                  {def.severity}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {def.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Owner: <strong>{def.owner || def.assignedTo}</strong></span>
                <StatusPill status={def.status} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

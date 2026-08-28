import React, { useState } from 'react';
import {
  ListChecks,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCode2,
  TestTube2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { Drawer } from '../components/common/Drawer';
import { useSimulation } from '../context/SimulationContext';
import { Requirement } from '../types';

export const Requirements: React.FC = () => {
  const { requirements } = useSimulation();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeReq, setActiveReq] = useState<Requirement | null>(null);

  const types = ['all', 'Functional', 'Security', 'Integration', 'Non-Functional'];
  const statuses = ['all', 'Verified', 'In Development', 'QA', 'Pending'];

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      req.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || req.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || req.verificationStatus === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const verifiedCount = requirements.filter((r) => r.verificationStatus === 'Verified').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-brand-blue" />
            Requirements & Traceability Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Accountable verification matrix linking business requirements directly to acceptance criteria, assigned tasks, code artifacts, test suites, and QA sign-offs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            {verifiedCount} / {requirements.length} Verified
          </Badge>
          <Badge variant="teal" size="md">
            10 Core Specifications
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4!">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search REQ ID, title, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-blue"
              />
            </div>

            {/* Type Dropdown */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-brand-blue"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Types' : t}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-brand-blue"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredRequirements.length} of {requirements.length} Requirements
          </span>
        </div>
      </Card>

      {/* Requirements Table */}
      <Card className="p-0! overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredRequirements.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setActiveReq(req)}
                  className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                    req.code === 'REQ-006' ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {req.code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 leading-snug">
                    {req.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {req.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        req.priority === 'Critical'
                          ? 'danger'
                          : req.priority === 'High'
                          ? 'amber'
                          : 'primary'
                      }
                    >
                      {req.priority}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                    {req.owner}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill status={req.verificationStatus} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      {req.verificationStatus === 'Verified' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Passed
                        </span>
                      ) : req.verificationStatus === 'QA' ? (
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          QA Rejected
                        </span>
                      ) : req.verificationStatus === 'In Development' ? (
                        <span className="text-amber-700 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Blocked (SEC-01)
                        </span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReq(req);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <span>Trace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Traceability Detail Drawer (Right-Side Panel) */}
      {activeReq && (
        <Drawer
          isOpen={!!activeReq}
          onClose={() => setActiveReq(null)}
          title={`${activeReq.code}: ${activeReq.title}`}
          subtitle={`End-to-End Traceability Ledger • Type: ${activeReq.type} • Owner: ${activeReq.owner}`}
          width="xl"
        >
          {/* Status Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Verification Status
              </span>
              <div className="mt-1">
                <StatusPill status={activeReq.verificationStatus} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Assigned Engineer
              </span>
              <span className="font-semibold text-slate-900">{activeReq.assignedAgent}</span>
            </div>
          </div>

          {/* Traceability Pathway Overview */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-blue" />
              Traceability Graph
            </h4>
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
              <div className="text-blue-400">Requirement ({activeReq.code})</div>
              <div className="text-slate-500 pl-3">↳ Acceptance Criteria ({activeReq.acceptanceCriteria.length} rules)</div>
              <div className="text-emerald-400 pl-6">↳ Assigned Tasks ({activeReq.linkedTasks.map(t => t.code).join(', ') || 'None'})</div>
              <div className="text-amber-400 pl-9">↳ Implementation Files ({activeReq.implementationFiles.length} files)</div>
              <div className="text-purple-400 pl-12">↳ Tests ({activeReq.linkedTests.map(t => `${t.code} ${t.status}`).join(', ') || 'None'})</div>
              <div className="text-teal-400 pl-15">↳ QA & Security Status ({activeReq.qaStatus} / {activeReq.securityStatus})</div>
            </div>
          </div>

          {/* 1. Acceptance Criteria */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Acceptance Criteria
            </h4>
            <div className="space-y-1.5">
              {activeReq.acceptanceCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-start gap-2.5"
                >
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    AC-{idx + 1}
                  </span>
                  <span className="leading-relaxed">{crit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Assigned Tasks */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-blue" />
              Assigned Tasks
            </h4>
            <div className="space-y-1.5">
              {activeReq.linkedTasks.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No tasks scheduled</span>
              ) : (
                activeReq.linkedTasks.map((t) => (
                  <div
                    key={t.code}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {t.code}
                      </span>
                      <span className="text-slate-800 font-medium">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Assigned</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Implementation Files */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-teal-600" />
              Implementation Files
            </h4>
            <div className="space-y-1">
              {activeReq.implementationFiles.map((f) => (
                <div
                  key={f}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                >
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Linked Tests */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <TestTube2 className="w-3.5 h-3.5 text-purple-600" />
              Automated Tests & Execution Evidence
            </h4>
            <div className="space-y-1.5">
              {activeReq.linkedTests.map((t) => (
                <div
                  key={t.code}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 mr-2">{t.code}</span>
                    <span className="text-slate-700">{t.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      t.status === 'PASS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : t.status === 'FAIL'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. QA Status & Security Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  QA Status
                </span>
                <StatusPill status={activeReq.qaStatus} />
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px] pt-1">
                {activeReq.qaEvidence}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Security Status
                </span>
                <StatusPill status={activeReq.securityStatus} />
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px] pt-1">
                {activeReq.securityEvidence}
              </p>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

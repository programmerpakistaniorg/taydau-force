import React from 'react';
import { Modal } from './Modal';
import { BookOpen, Shield, Cpu, Zap, CheckCircle2, Layers } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TayDau Force — Concept & Architecture Guide"
      subtitle="Autonomous Software Delivery Organization System Overview"
      maxWidth="2xl"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold bg-brand-navy hover:bg-slate-800 text-white rounded-lg transition-colors"
        >
          Close Documentation
        </button>
      }
    >
      <div className="space-y-5 text-slate-700 text-xs leading-relaxed">
        {/* Notice */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 block font-semibold">Interactive Prototype Notice</strong>
            This is a concept demonstration illustrating the 12-stage autonomous software delivery lifecycle. All agent outputs, test results, defect triages, and cost allocations are simulated for review purposes.
          </div>
        </div>

        {/* Section 1 */}
        <div>
          <h4 className="text-sm font-bold text-slate-950 flex items-center gap-1.5 mb-1.5">
            <Layers className="w-4 h-4 text-brand-blue" />
            What is TayDau Force?
          </h4>
          <p>
            TayDau Force simulates a complete AI software delivery organization that takes client requirements from inception to verified delivery. It replaces isolated prompt engineering with specialized autonomous roles (Business Analyst, Solution Architect, Full-Stack Engineer, QA Engineer, DevOps, Security Specialist) governed by quality, security, and cost control loops.
          </p>
        </div>

        {/* Section 2 */}
        <div>
          <h4 className="text-sm font-bold text-slate-950 flex items-center gap-1.5 mb-1.5">
            <Cpu className="w-4 h-4 text-brand-teal" />
            12-Stage RAD Feedback Lifecycle
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              '1. Client Idea',
              '2. Analysis',
              '3. Prototype',
              '4. Validation',
              '5. Architecture',
              '6. Team Assembly',
              '7. Build',
              '8. Review',
              '9. QA & Security',
              '10. Deploy',
              '11. Monitor',
              '12. Iterate'
            ].map((st, i) => (
              <div
                key={i}
                className="p-2 rounded bg-slate-50 border border-slate-200 font-medium text-slate-800 text-[11px]"
              >
                {st}
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 */}
        <div>
          <h4 className="text-sm font-bold text-slate-950 flex items-center gap-1.5 mb-1.5">
            <Shield className="w-4 h-4 text-rose-600" />
            Accountable Verification Rules
          </h4>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
            <li>
              <strong>Separation of Powers:</strong> Developers cannot approve their own code or mark requirements verified.
            </li>
            <li>
              <strong>Traceability Matrix:</strong> Every requirement links to acceptance criteria, code files, test runs, QA logs, and security findings.
            </li>
            <li>
              <strong>Cost Governance:</strong> Multi-tiered model routing assigns low-cost models to simple tasks and reasoning models to architectural decisions.
            </li>
            <li>
              <strong>Quality & Security Gates:</strong> Release is strictly blocked until all critical/high defects and release-blocking security findings are resolved.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

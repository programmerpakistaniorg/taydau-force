import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Agent,
  Requirement,
  Task,
  Defect,
  SecurityFinding,
  ActivityItem,
  CostSummary,
  DeliveryItem
} from '../types';
import {
  INITIAL_AGENTS,
  INITIAL_REQUIREMENTS,
  INITIAL_TASKS,
  INITIAL_DEFECTS,
  INITIAL_SECURITY_FINDINGS,
  INITIAL_ACTIVITIES,
  INITIAL_COST_SUMMARY,
  INITIAL_DELIVERY_ITEMS
} from '../data/mockData';

export interface SimulationStepInfo {
  step: number;
  title: string;
  description: string;
  actor: string;
  badge: string;
}

export const SIMULATION_STEPS: SimulationStepInfo[] = [
  {
    step: 0,
    title: 'Initial State',
    description: 'Sprint 2 in progress. Devon Coder (Full-Stack Engineer) is working on TASK-11 (Stock Transfer Lock).',
    actor: 'System Ready',
    badge: 'Baseline'
  },
  {
    step: 1,
    title: 'TASK-11 Code Completed',
    description: 'Devon Coder (Full-Stack Engineer) commits initial implementation of atomic transfer endpoint (commit #c8f3b2a).',
    actor: 'Full-Stack Engineer',
    badge: 'Code Commit'
  },
  {
    step: 2,
    title: 'TASK-11 Dispatched to QA',
    description: 'Marcus Planner (Project Manager) autonomously transitions TASK-11 to Review/QA lane and triggers test pipeline.',
    actor: 'Project Manager',
    badge: 'Pipeline Route'
  },
  {
    step: 3,
    title: 'QA Executes TEST-23',
    description: 'Quinn Tester (QA Engineer) runs automated concurrency test suite with 50 simultaneous transfer requests.',
    actor: 'QA Engineer',
    badge: 'Test Execution'
  },
  {
    step: 4,
    title: 'TEST-23 Concurrency Failure',
    description: 'TEST-23 fails! Detected negative stock balance under concurrent multi-warehouse transfer simulation.',
    actor: 'QA Engineer',
    badge: 'Failure Detected'
  },
  {
    step: 5,
    title: 'QA Rejects TASK-11',
    description: 'Quinn Tester rejects TASK-11 verification gate and attaches stack trace & reproduction payload.',
    actor: 'QA Engineer',
    badge: 'Gate Rejected'
  },
  {
    step: 6,
    title: 'DEF-03 Auto-Created',
    description: 'Autonomous Defect Engine logs DEF-03: "High-severity race condition under concurrent transfer requests" linked to REQ-006.',
    actor: 'System Governor',
    badge: 'Defect Logged'
  },
  {
    step: 7,
    title: 'PM Reassigns Defect to Engineer',
    description: 'Marcus Planner prioritizes DEF-03, generates escalation context, and reassigns TASK-11 to Devon Coder with prompt guidance.',
    actor: 'Project Manager',
    badge: 'Auto-Triage'
  },
  {
    step: 8,
    title: 'Engineer Applies Pessimistic Lock Fix',
    description: 'Devon Coder updates SQL queries with "SELECT FOR UPDATE" row locking and commits patch (commit #f92d410).',
    actor: 'Full-Stack Engineer',
    badge: 'Patch Applied'
  },
  {
    step: 9,
    title: 'QA Reruns Concurrency Test TEST-23',
    description: 'Quinn Tester re-executes 100 concurrent multi-warehouse transfer scenarios against the patched staging build.',
    actor: 'QA Engineer',
    badge: 'Retest'
  },
  {
    step: 10,
    title: 'TEST-23 100% Passed',
    description: 'All 100 concurrent requests processed with strict ACID consistency. 0 inventory over-allocations detected.',
    actor: 'QA Engineer',
    badge: 'Test Passed'
  },
  {
    step: 11,
    title: 'TASK-11 & REQ-006 Fully Verified',
    description: 'Quality Gate passed! TASK-11 signed off, DEF-03 closed, and REQ-006 marked as Verified in traceability matrix.',
    actor: 'Autonomous Delivery Gate',
    badge: 'Verified Sign-Off'
  }
];

interface SimulationContextType {
  currentStep: number;
  stepInfo: SimulationStepInfo;
  isSimulating: boolean;
  agents: Agent[];
  requirements: Requirement[];
  tasks: Task[];
  defects: Defect[];
  securityFindings: SecurityFinding[];
  activities: ActivityItem[];
  costSummary: CostSummary;
  deliveryItems: DeliveryItem[];
  simulateNextStep: () => void;
  resetSimulation: () => void;
  jumpToStep: (step: number) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const getComputedState = (step: number) => {
    // Deep clone base data to avoid accidental mutations
    let agents: Agent[] = JSON.parse(JSON.stringify(INITIAL_AGENTS));
    let requirements: Requirement[] = JSON.parse(JSON.stringify(INITIAL_REQUIREMENTS));
    let tasks: Task[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
    let defects: Defect[] = JSON.parse(JSON.stringify(INITIAL_DEFECTS));
    let securityFindings: SecurityFinding[] = JSON.parse(JSON.stringify(INITIAL_SECURITY_FINDINGS));
    let activities: ActivityItem[] = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));
    let costSummary: CostSummary = JSON.parse(JSON.stringify(INITIAL_COST_SUMMARY));
    let deliveryItems: DeliveryItem[] = JSON.parse(JSON.stringify(INITIAL_DELIVERY_ITEMS));

    // Target task and requirement
    const task12 = tasks.find(t => t.code === 'TASK-12' || t.code === 'TASK-11');
    const req006 = requirements.find(r => r.code === 'REQ-006');
    const devAgent = agents.find(a => a.id === 'agent-dev');
    const qaAgent = agents.find(a => a.id === 'agent-qa');
    const pmAgent = agents.find(a => a.id === 'agent-pm');

    if (step >= 1) {
      if (task12) {
        task12.progressPercent = 100;
        task12.commitHash = 'c8f3b2a';
      }
      activities.unshift({
        id: `sim-act-1`,
        time: '12:30',
        actor: 'Full-Stack Engineer',
        actorRole: 'Devon Coder',
        action: 'completed implementation of',
        target: 'TASK-11 (commit c8f3b2a)',
        type: 'task',
        tag: 'Code Complete',
        details: 'Initial transfer transaction implementation ready for QA validation.'
      });
      costSummary.totalCostUsed = +(costSummary.totalCostUsed + 0.03).toFixed(2);
      costSummary.totalModelCalls += 2;
    }

    if (step >= 2) {
      if (task12) task12.status = 'qa';
      if (devAgent) {
        devAgent.status = 'Completed';
        devAgent.currentTask = 'Awaiting QA Verification for TASK-12';
      }
      if (qaAgent) {
        qaAgent.status = 'Testing';
        qaAgent.currentTask = 'Executing Concurrency Suite for TASK-12';
      }
      activities.unshift({
        id: `sim-act-2`,
        time: '12:31',
        actor: 'Project Manager',
        actorRole: 'Marcus Planner',
        action: 'moved TASK-12 to',
        target: 'Review / QA Lane',
        type: 'task',
        tag: 'Routing',
        details: 'Autonomous pipeline trigger dispatched to Quinn Tester.'
      });
    }

    if (step >= 3) {
      activities.unshift({
        id: `sim-act-3`,
        time: '12:32',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'executed test suite',
        target: 'TEST-23 (Multi-Warehouse Concurrency)',
        type: 'qa',
        tag: 'Test Run',
        details: 'Simulating 50 concurrent stock transfer requests between Austin & Chicago.'
      });
      costSummary.totalCostUsed = +(costSummary.totalCostUsed + 0.02).toFixed(2);
      costSummary.totalModelCalls += 1;
    }

    if (step >= 4) {
      if (req006) {
        const test23 = req006.linkedTests.find(t => t.code === 'TEST-23');
        if (test23) test23.status = 'FAIL';
        req006.qaStatus = 'Testing';
      }
      activities.unshift({
        id: `sim-act-4`,
        time: '12:33',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'detected failure in',
        target: 'TEST-23 (Race Condition Over-Allocation)',
        type: 'qa',
        tag: 'Test Failure',
        details: 'Negative inventory balance detected: 4 units over-allocated during concurrent transfer test.'
      });
    }

    if (step >= 5) {
      if (task12) task12.status = 'in_development';
      if (req006) {
        req006.qaStatus = 'Rejected';
        req006.verificationStatus = 'Rejected';
      }
      activities.unshift({
        id: `sim-act-5`,
        time: '12:34',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'rejected verification gate for',
        target: 'TASK-12 (Stock Transfer API)',
        type: 'qa',
        tag: 'Gate Rejected',
        details: 'Quality Policy Enforced: Automatic rollback to Devon Coder.'
      });
    }

    if (step >= 6) {
      defects.unshift({
        id: 'def-3',
        code: 'DEF-03',
        title: 'Multi-Warehouse stock race condition under concurrent transfer requests',
        severity: 'High',
        status: 'Open',
        relatedTask: 'TASK-12',
        relatedReq: 'REQ-006',
        discoveredBy: 'QA Engineer',
        assignedTo: 'Project Manager',
        description: 'Under 50 simultaneous transfer calls, PostgreSQL read-modify-write without pessimistic row lock results in -4 inventory discrepancy.',
        createdAt: '12:34'
      });
      activities.unshift({
        id: `sim-act-6`,
        time: '12:35',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'logged defect record',
        target: 'DEF-03 (High Severity)',
        type: 'defect',
        tag: 'Defect Logged',
        details: 'Auto-triaged to Devon Coder (Full-Stack) with reproduced telemetry logs.'
      });
    }

    if (step >= 7) {
      const def3 = defects.find(d => d.code === 'DEF-03');
      if (def3) {
        def3.status = 'In Fix';
      }
      if (devAgent) {
        devAgent.status = 'Working';
        devAgent.currentTask = 'Refactoring TASK-12: Adding Row-Level Locking';
      }
      activities.unshift({
        id: `sim-act-7`,
        time: '12:36',
        actor: 'Full-Stack Engineer',
        actorRole: 'Devon Coder',
        action: 'started remediation for',
        target: 'DEF-03 / TASK-12',
        type: 'task',
        tag: 'Auto-Triage',
        details: 'Re-evaluating SQL isolation level with Database Specialist consultation.'
      });
      costSummary.retriesCount += 1;
    }

    if (step >= 8) {
      if (task12) {
        task12.commitHash = 'f92d410';
        task12.progressPercent = 100;
        task12.description = 'Fixed: Implemented PostgreSQL SELECT FOR UPDATE with transaction isolation level REPEATABLE READ.';
      }
      activities.unshift({
        id: `sim-act-8`,
        time: '12:37',
        actor: 'Full-Stack Engineer',
        actorRole: 'Devon Coder',
        action: 'committed atomic fix',
        target: 'commit f92d410 (SELECT FOR UPDATE lock)',
        type: 'task',
        tag: 'Fix Applied',
        details: 'Integrated row-level pessimistic lock and transaction boundary in transferService.ts.'
      });
      costSummary.totalCostUsed = +(costSummary.totalCostUsed + 0.05).toFixed(2);
      costSummary.totalModelCalls += 3;
    }

    if (step >= 9) {
      if (task12) task12.status = 'qa';
      if (qaAgent) {
        qaAgent.status = 'Testing';
        qaAgent.currentTask = 'Rerunning Concurrency Stress Suite (100 threads)';
      }
      activities.unshift({
        id: `sim-act-9`,
        time: '12:38',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'reran stress test suite',
        target: 'TEST-23 on commit f92d410',
        type: 'qa',
        tag: 'Retesting',
        details: 'Executing 100 parallel transactions across Austin, Chicago, and Houston warehouses.'
      });
    }

    if (step >= 10) {
      if (req006) {
        const test23 = req006.linkedTests.find(t => t.code === 'TEST-23');
        if (test23) test23.status = 'PASS';
        req006.qaStatus = 'Passed';
        req006.qaEvidence = 'TEST-23 PASSED: 100 concurrent transactions executed with zero anomalies. All balances atomic.';
      }
      const def3 = defects.find(d => d.code === 'DEF-03');
      if (def3) def3.status = 'Resolved';

      activities.unshift({
        id: `sim-act-10`,
        time: '12:39',
        actor: 'QA Engineer',
        actorRole: 'Quinn Tester',
        action: 'verified passing result for',
        target: 'TEST-23 (100% Passed)',
        type: 'qa',
        tag: 'Test Passed',
        details: 'Zero over-allocations detected. Concurrency validation signed off.'
      });
    }

    if (step >= 11) {
      if (task12) task12.status = 'done';
      if (req006) {
        req006.implementationStatus = 'Completed';
        req006.qaStatus = 'Passed';
        req006.securityStatus = 'Passed';
        req006.verificationStatus = 'Verified';
      }
      const def3 = defects.find(d => d.code === 'DEF-03');
      if (def3) def3.status = 'Verified';

      if (qaAgent) {
        qaAgent.status = 'Testing';
        qaAgent.currentTask = 'Monitoring regression pipeline';
      }
      if (devAgent) {
        devAgent.status = 'Working';
        devAgent.currentTask = 'Starting TASK-15 (Threshold Evaluation)';
        devAgent.tasksCompleted += 1;
      }

      costSummary.verifiedRequirements = 9;
      costSummary.costPerVerifiedReq = +(costSummary.totalCostUsed / 9).toFixed(2);

      const delApp = deliveryItems.find(d => d.id === 'del-1');
      if (delApp) delApp.status = 'In Progress';
      const delQa = deliveryItems.find(d => d.id === 'del-7');
      if (delQa) delQa.status = 'Ready';

      activities.unshift({
        id: `sim-act-11`,
        time: '12:40',
        actor: 'Autonomous Delivery Gate',
        actorRole: 'TayDau Governor',
        action: 'certified verification sign-off for',
        target: 'REQ-006 & TASK-12',
        type: 'system',
        tag: 'Requirement Verified',
        details: 'Requirement REQ-006 (Stock transfer) certified and closed.'
      });
    }

    return {
      agents,
      requirements,
      tasks,
      defects,
      securityFindings,
      activities,
      costSummary,
      deliveryItems
    };
  };

  const simulateNextStep = () => {
    setIsSimulating(true);
    setCurrentStep((prev) => (prev < SIMULATION_STEPS.length - 1 ? prev + 1 : prev));
    setTimeout(() => setIsSimulating(false), 300);
  };

  const resetSimulation = () => {
    setCurrentStep(0);
  };

  const jumpToStep = (step: number) => {
    if (step >= 0 && step < SIMULATION_STEPS.length) {
      setCurrentStep(step);
    }
  };

  const computed = getComputedState(currentStep);
  const stepInfo = SIMULATION_STEPS[currentStep];

  return (
    <SimulationContext.Provider
      value={{
        currentStep,
        stepInfo,
        isSimulating,
        agents: computed.agents,
        requirements: computed.requirements,
        tasks: computed.tasks,
        defects: computed.defects,
        securityFindings: computed.securityFindings,
        activities: computed.activities,
        costSummary: computed.costSummary,
        deliveryItems: computed.deliveryItems,
        simulateNextStep,
        resetSimulation,
        jumpToStep
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

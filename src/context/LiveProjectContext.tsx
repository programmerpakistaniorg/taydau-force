import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as api from '../services/api';
import { FullProjectResponse, ProjectSummary } from '../types/api';
import { ROLE_REGISTRY, type RoleKey } from '../config/roles';

export type AppMode = 'live' | 'demo';

const DEFAULT_MODE: AppMode = (import.meta.env.VITE_TAYDAU_MODE as AppMode) || 'live';

interface LiveProjectContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  activeProjectId: string | null;
  project: FullProjectResponse | null;
  projectsList: ProjectSummary[];
  isLoading: boolean;
  isActionInProgress: boolean;
  isPolling: boolean;
  error: string | null;
  currentProgressMessage: string;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string, clientBrief: string) => Promise<string>;
  answerInteraction: (interactionId: string, answer: any) => Promise<void>;
  approveRequest: (approvalId: string) => Promise<void>;
  requestChanges: (approvalId: string, feedback: string) => Promise<void>;
  retryStage: () => Promise<void>;
  advanceProject: (id?: string) => Promise<void>;
  pauseProject: () => Promise<void>;
  resumeProject: () => Promise<void>;
  endProject: () => Promise<void>;
  clearActiveProject: () => void;
  refreshProject: () => Promise<void>;
}

const LiveProjectContext = createContext<LiveProjectContextType | undefined>(undefined);

function getProgressMessage(project: FullProjectResponse | null): string {
  if (!project) return 'No active project.';

  const wf = project.workflow;
  if (!wf) return 'Project initialized.';

  if (wf.stageStatus === 'paused') {
    return 'Project paused by client. Autonomous delivery loop is on hold.';
  }

  if (wf.stageStatus === 'cancelled') {
    return 'Project ended permanently.';
  }

  if (wf.stageStatus === 'failed') {
    return wf.lastErrorSummary || 'Development requires attention.';
  }

  if (wf.stageStatus === 'completed' || wf.stage === 'completed') {
    return '100% Verified Delivery Complete. Solution tested and ready for release.';
  }

  if (wf.stageStatus === 'waiting_for_client') {
    if (project.pendingInteractions && project.pendingInteractions.length > 0) {
      const roleKey = project.pendingInteractions[0].agentRole as RoleKey;
      const roleDef = ROLE_REGISTRY[roleKey];
      return `Waiting for your decision: ${project.pendingInteractions.length} question(s) from ${roleDef?.displayName || 'Specialist'}.`;
    }
    if (project.pendingApproval) {
      return project.pendingApproval.artifactType === 'requirements'
        ? 'Requirements Baseline ready for your review & approval.'
        : 'Interactive Wireframe Preview ready for your review & approval.';
    }
  }

  if (wf.stageStatus === 'running') {
    const roleDef = wf.activeRole ? ROLE_REGISTRY[wf.activeRole as RoleKey] : null;
    switch (wf.stage) {
      case 'created':
      case 'business_analysis':
        return `${roleDef?.personaName || 'Aria Analyst'} is analyzing your business idea and extracting testable requirements...`;
      case 'project_planning':
        return `${roleDef?.personaName || 'Marcus Planner'} is sequencing milestones, risk mitigation, and specialist allocation...`;
      case 'ui_ux_design':
        return `${roleDef?.personaName || 'Sofia Designer'} is generating wireframe layouts and interactive product preview...`;
      case 'technical_architecture':
        return `${roleDef?.personaName || 'Arthur Blueprint'} is designing the FastAPI service architecture and SQLite schema...`;
      case 'implementation':
        return `${roleDef?.personaName || 'Devon Coder'} is generating production Python 3.11 source code...`;
      case 'code_review':
        return `${roleDef?.personaName || 'Dr. Evelyn Auditor'} is auditing architectural compliance and scanning for security findings...`;
      case 'independent_qa':
        return `${roleDef?.personaName || 'Quinn Tester'} is deriving acceptance tests & executing in isolated sandbox...`;
      case 'security_review':
      case 'release_evaluation':
        return 'Verifying release readiness across all 7 quality gates...';
      default:
        return 'TayDau Force is working on your software delivery slice...';
    }
  }

  return 'Team ready.';
}

export const LiveProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem('taydau_mode');
    return (saved as AppMode) || DEFAULT_MODE;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('taydau_active_project_id') || null;
  });

  const [project, setProject] = useState<FullProjectResponse | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('taydau_mode', newMode);
  };

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fetchProject(id);
      setProject(data);
      setActiveProjectId(id);
      localStorage.setItem('taydau_active_project_id', id);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProject = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const data = await api.fetchProject(activeProjectId);
      setProject(data);
    } catch (err: any) {
      console.error('Silent refresh failed:', err);
    }
  }, [activeProjectId]);

  const loadProjectsList = useCallback(async () => {
    try {
      const list = await api.fetchProjects();
      setProjectsList(list);
      if (!activeProjectId && list.length > 0) {
        loadProject(list[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch projects list:', err);
    }
  }, [activeProjectId, loadProject]);

  // Continuous polling while live project is active and not completed/failed
  useEffect(() => {
    if (mode !== 'live' || !activeProjectId) {
      setIsPolling(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const isProjectActive =
      project?.workflow?.stageStatus !== 'completed' &&
      project?.workflow?.stageStatus !== 'failed' &&
      project?.workflow?.stage !== 'completed';

    if (isProjectActive) {
      setIsPolling(true);
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(async () => {
          try {
            const data = await api.fetchProject(activeProjectId);
            setProject(data);

            const stillActive =
              data.workflow?.stageStatus !== 'completed' &&
              data.workflow?.stageStatus !== 'failed' &&
              data.workflow?.stage !== 'completed';

            if (!stillActive) {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              setIsPolling(false);
              loadProjectsList();
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        }, 2000);
      }
    } else {
      setIsPolling(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [mode, activeProjectId, project?.workflow?.stageStatus, project?.workflow?.stage, loadProjectsList]);

  // Initial load
  useEffect(() => {
    loadProjectsList();
    if (activeProjectId) {
      loadProject(activeProjectId);
    }
  }, []);

  const createProject = async (name: string, clientBrief: string): Promise<string> => {
    setIsActionInProgress(true);
    setError(null);
    try {
      const newProj = await api.createProject(name, clientBrief);
      setActiveProjectId(newProj.id);
      localStorage.setItem('taydau_active_project_id', newProj.id);
      await loadProject(newProj.id);
      await loadProjectsList();
      return newProj.id;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const answerInteraction = async (interactionId: string, answer: any): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.answerInteraction(activeProjectId, interactionId, answer);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const approveRequest = async (approvalId: string): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.approveRequest(activeProjectId, approvalId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const requestChanges = async (approvalId: string, feedback: string): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.requestChanges(activeProjectId, approvalId, feedback);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to request changes');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const retryStage = async (): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.retryStage(activeProjectId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to retry stage');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const advanceProject = async (id?: string): Promise<void> => {
    const targetId = id || activeProjectId;
    if (!targetId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.advanceProject(targetId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to advance project');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const pauseProject = async (): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.pauseProject(activeProjectId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to pause project');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const resumeProject = async (): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.resumeProject(activeProjectId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to resume project');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const endProject = async (): Promise<void> => {
    if (!activeProjectId) return;
    setIsActionInProgress(true);
    setError(null);
    try {
      await api.endProject(activeProjectId);
      await refreshProject();
    } catch (err: any) {
      setError(err.message || 'Failed to end project');
      throw err;
    } finally {
      setIsActionInProgress(false);
    }
  };

  const clearActiveProject = () => {
    setActiveProjectId(null);
    setProject(null);
    localStorage.removeItem('taydau_active_project_id');
  };

  return (
    <LiveProjectContext.Provider
      value={{
        mode,
        setMode,
        activeProjectId,
        project,
        projectsList,
        isLoading,
        isActionInProgress,
        isPolling,
        error,
        currentProgressMessage: getProgressMessage(project),
        loadProject,
        createProject,
        answerInteraction,
        approveRequest,
        requestChanges,
        retryStage,
        advanceProject,
        pauseProject,
        resumeProject,
        endProject,
        clearActiveProject,
        refreshProject,
      }}
    >
      {children}
    </LiveProjectContext.Provider>
  );
};

export const useLiveProject = () => {
  const context = useContext(LiveProjectContext);
  if (!context) {
    throw new Error('useLiveProject must be used within a LiveProjectProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as api from '../services/api';
import { FullProjectResponse, ProjectSummary } from '../types/api';
import { ROLE_REGISTRY, type RoleKey } from '../config/roles';
import { createLocalAutonomousProject, advanceLocalProject } from '../services/client-delivery-runner';

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
  connectionStatus: 'connected' | 'reconnecting' | 'fallback_polling' | 'disconnected';
  error: string | null;
  currentProgressMessage: string;
  autonomyMode: 'auto_pilot' | 'supervised';
  setAutonomyMode: (mode: 'auto_pilot' | 'supervised') => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string, clientBrief: string, autonomyMode?: 'auto_pilot' | 'supervised') => Promise<string>;
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
        return `${roleDef?.personaName || 'Sana Tariq'} is analyzing your business idea and extracting testable requirements...`;
      case 'project_planning':
        return `${roleDef?.personaName || 'Muhammad Tayyab'} is sequencing milestones, risk mitigation, and specialist allocation...`;
      case 'ui_ux_design':
        return `${roleDef?.personaName || 'Fatima Zahra'} is generating wireframe layouts and interactive product preview...`;
      case 'technical_architecture':
        return `${roleDef?.personaName || 'Daud Sheraz'} is designing the FastAPI service architecture and SQLite schema...`;
      case 'implementation':
        return `${roleDef?.personaName || 'Ali Hassan'} is generating production Python 3.11 source code...`;
      case 'code_review':
        return `${roleDef?.personaName || 'Dr. Usman Siddiqui'} is auditing architectural compliance and scanning for security findings...`;
      case 'independent_qa':
        return `${roleDef?.personaName || 'Bilal Raza'} is deriving acceptance tests & executing in isolated sandbox...`;
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'fallback_polling' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [autonomyMode, setAutonomyModeState] = useState<'auto_pilot' | 'supervised'>('auto_pilot');

  const pollTimerRef = useRef<any>(null);
  const localRunnerTimerRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (project?.autonomyMode) {
      setAutonomyModeState(project.autonomyMode);
    }
  }, [project?.autonomyMode]);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('taydau_mode', newMode);
  };

  // Client-side autonomous runner for offline / Vercel demo execution
  const startLocalAutonomousRunner = useCallback((projId: string) => {
    if (localRunnerTimerRef.current) {
      clearInterval(localRunnerTimerRef.current);
      localRunnerTimerRef.current = null;
    }

    localRunnerTimerRef.current = setInterval(() => {
      setProject((prev) => {
        if (!prev || prev.id !== projId) {
          if (localRunnerTimerRef.current) clearInterval(localRunnerTimerRef.current);
          return prev;
        }

        if (prev.workflow.stageStatus === 'completed' || prev.workflow.stage === 'completed') {
          if (localRunnerTimerRef.current) clearInterval(localRunnerTimerRef.current);
          return prev;
        }

        if (prev.workflow.stageStatus === 'paused' || prev.workflow.stageStatus === 'cancelled') {
          return prev;
        }

        // Advance project to next specialist stage
        const next = advanceLocalProject(prev);
        localStorage.setItem(`taydau_local_project_${projId}`, JSON.stringify(next));

        setProjectsList((list) =>
          list.map((p) =>
            p.id === projId
              ? {
                  ...p,
                  stage: next.workflow.stage,
                  stageStatus: next.workflow.stageStatus,
                  progress: next.workflow.progress,
                  status: next.status,
                  updatedAt: next.workflow.updatedAt,
                }
              : p
          )
        );

        return next;
      });
    }, 3500);
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fetchProject(id);
      setProject(data);
      setActiveProjectId(id);
      localStorage.setItem('taydau_active_project_id', id);
    } catch (err: any) {
      // Check local storage for client-side project
      const localData = localStorage.getItem(`taydau_local_project_${id}`);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setProject(parsed);
          setActiveProjectId(id);
          localStorage.setItem('taydau_active_project_id', id);
          if (parsed.workflow.stageStatus === 'running' && parsed.workflow.stage !== 'completed') {
            startLocalAutonomousRunner(id);
          }
          return;
        } catch (parseErr) {
          console.warn('[LiveProjectContext] Local project corrupt:', parseErr);
        }
      }

      console.warn(`[LiveProjectContext] Project ${id} failed to load. Clearing stale ID:`, err.message);
      localStorage.removeItem('taydau_active_project_id');
      setActiveProjectId(null);
      setProject(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [startLocalAutonomousRunner]);

  const refreshProject = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const data = await api.fetchProject(activeProjectId);
      setProject(data);
    } catch (err: any) {
      const localData = localStorage.getItem(`taydau_local_project_${activeProjectId}`);
      if (localData) {
        try {
          setProject(JSON.parse(localData));
        } catch {}
      }
    }
  }, [activeProjectId]);

  const loadProjectsList = useCallback(async () => {
    try {
      const list = await api.fetchProjects();
      setProjectsList(list);
      if (list.length > 0) {
        const storedId = localStorage.getItem('taydau_active_project_id');
        const isValidStored = storedId && list.some((p) => p.id === storedId);
        if (!isValidStored) {
          await loadProject(list[0].id);
        }
      }
    } catch (err: any) {
      console.warn('[LiveProjectContext] Failed to fetch server projects list, using local cache:', err.message);
      const storedId = localStorage.getItem('taydau_active_project_id');
      if (storedId) {
        await loadProject(storedId);
      }
    }
  }, [loadProject]);

  // Real-Time SSE Stream with Fallback Polling
  useEffect(() => {
    if (mode !== 'live' || !activeProjectId || activeProjectId.startsWith('local_')) {
      setConnectionStatus('disconnected');
      setIsPolling(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const startFallbackPolling = () => {
      setIsPolling(true);
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(async () => {
          try {
            await refreshProject();
          } catch (err) {
            console.error('[LiveProjectContext] Fallback polling error:', err);
          }
        }, 5000);
      }
    };

    const stopFallbackPolling = () => {
      setIsPolling(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const sseUrl = `${api.API_BASE}/projects/${activeProjectId}/events${lastEventIdRef.current ? `?lastEventId=${lastEventIdRef.current}` : ''}`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
        stopFallbackPolling();
      };

      es.onmessage = (event) => {
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId;
        }
        try {
          const payload = JSON.parse(event.data);
          if (payload.eventType && payload.eventType !== 'agent.activity') {
            refreshProject();
          }
        } catch (err) {}
      };

      const handleTypedEvent = (event: MessageEvent) => {
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId;
        }
        refreshProject();
      };

      const eventTypes = [
        'workflow.stage.started',
        'workflow.stage.completed',
        'workflow.stage.waiting_for_client',
        'workflow.needs_attention',
        'interaction.required',
        'interaction.resolved',
        'approval.required',
        'approval.approved',
        'approval.changes_requested',
        'design.generated',
        'design.approved',
        'implementation.revision.created',
        'qa.started',
        'qa.completed',
        'verification.started',
        'verification.completed',
        'release.ready',
      ];

      for (const type of eventTypes) {
        es.addEventListener(type, handleTypedEvent as EventListener);
      }

      es.onerror = () => {
        setConnectionStatus('fallback_polling');
        startFallbackPolling();
      };
    } catch {
      startFallbackPolling();
    }

    return () => {
      if (es) es.close();
      eventSourceRef.current = null;
      stopFallbackPolling();
    };
  }, [mode, activeProjectId, refreshProject]);

  // Initial load
  useEffect(() => {
    loadProjectsList();
    if (activeProjectId) {
      loadProject(activeProjectId);
    }
  }, []);

  const setAutonomyMode = async (newMode: 'auto_pilot' | 'supervised') => {
    setAutonomyModeState(newMode);
    if (activeProjectId) {
      try {
        await api.updateAutonomyMode(activeProjectId, newMode);
        await refreshProject();
      } catch (err: any) {
        // Fallback for local project
        setProject((prev) => {
          if (!prev) return null;
          const updated = { ...prev, autonomyMode: newMode };
          localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  const createProject = async (
    name: string,
    clientBrief: string,
    selectedAutonomy: 'auto_pilot' | 'supervised' = 'auto_pilot'
  ): Promise<string> => {
    setIsActionInProgress(true);
    setError(null);

    try {
      const newProj = await api.createProject(name, clientBrief, selectedAutonomy);
      setActiveProjectId(newProj.id);
      localStorage.setItem('taydau_active_project_id', newProj.id);
      await loadProject(newProj.id);
      await loadProjectsList();
      return newProj.id;
    } catch (err: any) {
      console.warn('[LiveProjectContext] Backend offline or unreachable. Engaging client-side autonomous engine:', err.message);

      // Client-side autonomous runner for Vercel/offline demo execution
      const localProj = createLocalAutonomousProject(name, clientBrief, selectedAutonomy);
      setActiveProjectId(localProj.id);
      setProject(localProj);
      localStorage.setItem('taydau_active_project_id', localProj.id);
      localStorage.setItem(`taydau_local_project_${localProj.id}`, JSON.stringify(localProj));

      setProjectsList((prev) => [
        {
          id: localProj.id,
          name: localProj.name,
          clientBrief: localProj.clientBrief,
          status: localProj.status,
          stage: localProj.workflow.stage,
          stageStatus: localProj.workflow.stageStatus,
          progress: localProj.workflow.progress,
          autonomyMode: localProj.autonomyMode,
          createdAt: localProj.workflow.startedAt,
          updatedAt: localProj.workflow.updatedAt,
        },
        ...prev.filter((p) => p.id !== localProj.id),
      ]);

      startLocalAutonomousRunner(localProj.id);
      return localProj.id;
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
      console.warn('[LiveProjectContext] Local answer interaction fallback:', err.message);
      setProject((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          pendingInteractions: prev.pendingInteractions.filter((i) => i.id !== interactionId),
        };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
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
      console.warn('[LiveProjectContext] Local approve fallback:', err.message);
      setProject((prev) => {
        if (!prev) return null;
        const updated = { ...prev, pendingApproval: null };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
      startLocalAutonomousRunner(activeProjectId);
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
      console.warn('[LiveProjectContext] Local request changes fallback:', err.message);
      setProject((prev) => {
        if (!prev) return null;
        const updated = { ...prev, pendingApproval: null };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
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
      console.warn('[LiveProjectContext] Local retry stage fallback:', err.message);
      setProject((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          workflow: { ...prev.workflow, stageStatus: 'running' },
        };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
      startLocalAutonomousRunner(activeProjectId);
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
      setProject((prev) => {
        if (!prev) return null;
        const next = advanceLocalProject(prev);
        localStorage.setItem(`taydau_local_project_${targetId}`, JSON.stringify(next));
        return next;
      });
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
      if (localRunnerTimerRef.current) {
        clearInterval(localRunnerTimerRef.current);
        localRunnerTimerRef.current = null;
      }
      setProject((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          workflow: { ...prev.workflow, stageStatus: 'paused' },
        };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
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
      setProject((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          workflow: { ...prev.workflow, stageStatus: 'running' },
        };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
      startLocalAutonomousRunner(activeProjectId);
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
      if (localRunnerTimerRef.current) {
        clearInterval(localRunnerTimerRef.current);
        localRunnerTimerRef.current = null;
      }
      setProject((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          workflow: { ...prev.workflow, stageStatus: 'cancelled' },
        };
        localStorage.setItem(`taydau_local_project_${activeProjectId}`, JSON.stringify(updated));
        return updated;
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  const clearActiveProject = () => {
    if (localRunnerTimerRef.current) {
      clearInterval(localRunnerTimerRef.current);
      localRunnerTimerRef.current = null;
    }
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
        connectionStatus,
        error,
        currentProgressMessage: getProgressMessage(project),
        autonomyMode,
        setAutonomyMode,
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

export const useLiveProject = (): LiveProjectContextType => {
  const context = useContext(LiveProjectContext);
  if (!context) {
    throw new Error('useLiveProject must be used within a LiveProjectProvider');
  }
  return context;
};

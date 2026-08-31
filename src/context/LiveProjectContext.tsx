import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api } from '../services/api';
import { FullProjectResponse, ProjectSummary } from '../types/api';

export type AppMode = 'live' | 'demo';

const DEFAULT_MODE: AppMode = (import.meta.env.VITE_TAYDAU_MODE as AppMode) || 'live';

interface LiveProjectContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  activeProjectId: string | null;
  project: FullProjectResponse | null;
  projectsList: ProjectSummary[];
  reworkProject: FullProjectResponse | null;
  isLoading: boolean;
  isAdvancing: boolean;
  isPolling: boolean;
  error: string | null;
  currentProgressMessage: string;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string, clientBrief: string) => Promise<string>;
  advanceProject: (id?: string) => Promise<void>;
  refreshProject: () => Promise<void>;
}

const LiveProjectContext = createContext<LiveProjectContextType | undefined>(undefined);

const ACTIVE_STATES = new Set([
  'submitted',
  'analyzing',
  'planning',
  'architecting',
  'implementing',
  'verifying'
]);

function getProgressMessage(status: string | undefined): string {
  switch (status) {
    case 'submitted':
    case 'analyzing':
      return 'Business Analyst is analyzing client brief and extracting requirements...';
    case 'analyzed':
      return 'Requirements analyzed & validated. Ready for project planning.';
    case 'planning':
      return 'Project Manager is planning tasks and relational traceability matrix...';
    case 'planned':
      return 'Tasks planned. Ready for solution architecture.';
    case 'architecting':
      return 'Solution Architect is defining technical specifications & contracts...';
    case 'designed':
      return 'Architecture designed. Ready for engineering execution.';
    case 'implementing':
      return 'Senior Full-Stack Engineer is generating production source code...';
    case 'implemented':
      return 'Implementation generated. Ready for independent QA test derivation.';
    case 'verifying':
      return 'Independent QA deriving tests & executing in hardened Docker sandbox...';
    case 'tested_passed':
      return 'Acceptance tests passed (8/8). Evaluating code review & security gate...';
    case 'release_ready':
      return 'Release readiness certified! 8/8 deterministic governance checks passed.';
    case 'defects_found':
      return 'Independent QA detected defect(s). Routed to Engineer rework.';
    case 'qa_error':
      return 'QA Generation Error: test artifact contract mismatch.';
    case 'sandbox_error':
      return 'Docker Sandbox Infrastructure Error.';
    case 'timed_out':
      return 'Execution timed out.';
    default:
      return 'System idle.';
  }
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
  const [reworkProject, setReworkProject] = useState<FullProjectResponse | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);
  const isAdvancingRef = useRef<boolean>(false);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('taydau_mode', newMode);
  };

  const fetchProjectDetails = useCallback(async (id: string, isBackgroundPoll = false) => {
    if (!isBackgroundPoll) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await api.getProject(id);
      setProject(data);
      return data;
    } catch (err: any) {
      if (!isBackgroundPoll) {
        setError(err.message || 'Failed to load project from backend');
        setProject(null);
      }
      return null;
    } finally {
      if (!isBackgroundPoll) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchProjectsList = useCallback(async () => {
    try {
      const res = await api.getProjects();
      const list = res.projects || [];
      setProjectsList(list);

      // If activeProjectId is not in list or list is empty, synchronize state
      setActiveProjectId(prev => {
        if (list.length === 0) {
          localStorage.removeItem('taydau_active_project_id');
          setProject(null);
          return null;
        }
        if (prev && list.some(p => p.id === prev)) {
          return prev;
        }
        const fallbackId = list[0].id;
        localStorage.setItem('taydau_active_project_id', fallbackId);
        return fallbackId;
      });
    } catch {
      // Non-blocking for offline demo fallback
    }
  }, []);

  const loadProject = useCallback(async (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem('taydau_active_project_id', id);
    await fetchProjectDetails(id);
  }, [fetchProjectDetails]);

  const createProject = useCallback(async (name: string, clientBrief: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createProject(name, clientBrief);
      setActiveProjectId(res.id);
      localStorage.setItem('taydau_active_project_id', res.id);
      await fetchProjectsList();
      await fetchProjectDetails(res.id);
      return res.id;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjectsList, fetchProjectDetails]);

  const advanceProject = useCallback(async (id?: string) => {
    const targetId = id || activeProjectId;
    if (!targetId || isAdvancingRef.current) return;

    isAdvancingRef.current = true;
    setIsAdvancing(true);
    setError(null);

    try {
      await api.advanceProject(targetId);
      await fetchProjectDetails(targetId);
    } catch (err: any) {
      setError(err.message || 'Failed to advance project stage');
    } finally {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [activeProjectId, fetchProjectDetails]);

  const refreshProject = useCallback(async () => {
    if (activeProjectId) {
      await fetchProjectDetails(activeProjectId);
    }
    await fetchProjectsList();
  }, [activeProjectId, fetchProjectDetails, fetchProjectsList]);

  // Initial load
  useEffect(() => {
    if (mode === 'live') {
      fetchProjectsList();
      if (activeProjectId) {
        fetchProjectDetails(activeProjectId);
      }
    }
  }, [mode, activeProjectId, fetchProjectsList, fetchProjectDetails]);

  // Polling loop for active project states
  useEffect(() => {
    if (mode !== 'live' || !activeProjectId || !project) {
      setIsPolling(false);
      return;
    }

    const shouldPoll = ACTIVE_STATES.has(project.status) || isAdvancing;

    if (shouldPoll) {
      setIsPolling(true);
      pollTimerRef.current = setInterval(async () => {
        const updated = await fetchProjectDetails(activeProjectId, true);
        if (updated && !ACTIVE_STATES.has(updated.status) && !isAdvancingRef.current) {
          setIsPolling(false);
          clearInterval(pollTimerRef.current);
        }
      }, 2500);
    } else {
      setIsPolling(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [mode, activeProjectId, project?.status, isAdvancing, fetchProjectDetails]);

  const currentProgressMessage = getProgressMessage(project?.status);

  return (
    <LiveProjectContext.Provider
      value={{
        mode,
        setMode,
        activeProjectId,
        project,
        projectsList,
        reworkProject,
        isLoading,
        isAdvancing,
        isPolling,
        error,
        currentProgressMessage,
        loadProject,
        createProject,
        advanceProject,
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

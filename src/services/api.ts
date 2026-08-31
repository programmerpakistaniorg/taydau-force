import { FullProjectResponse, ProjectSummary } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    let body: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof body === 'object' && body?.error 
        ? body.error 
        : `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, body);
    }

    return body as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failure', 0, err);
  }
}

export const api = {
  /** List all projects */
  async getProjects(): Promise<{ projects: ProjectSummary[] }> {
    return request<{ projects: ProjectSummary[] }>('/projects');
  },

  /** Get complete project detail */
  async getProject(id: string): Promise<FullProjectResponse> {
    return request<FullProjectResponse>(`/projects/${id}`);
  },

  /** Create project with client brief (starts BA automatically) */
  async createProject(name: string, clientBrief: string): Promise<{ id: string; name: string; status: string }> {
    return request<{ id: string; name: string; status: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, clientBrief }),
    });
  },

  /** Advance project to next lifecycle stage */
  async advanceProject(id: string): Promise<{ id: string; status: string; message: string }> {
    return request<{ id: string; status: string; message: string }>(`/projects/${id}/advance`, {
      method: 'POST',
    });
  },
};

import type { FullProjectResponse, ProjectSummary } from '../types/api';

const API_BASE = '/api';

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return data.projects;
}

export async function fetchProject(id: string): Promise<FullProjectResponse> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch project ${id}`);
  return res.json();
}

export async function createProject(name: string, clientBrief: string): Promise<{ id: string; name: string; status: string }> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, clientBrief }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create project');
  }
  return res.json();
}

export async function answerInteraction(projectId: string, interactionId: string, answer: any): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/interactions/${interactionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit answer');
  }
  return res.json();
}

export async function approveRequest(projectId: string, approvalId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to approve request');
  }
  return res.json();
}

export async function requestChanges(projectId: string, approvalId: string, feedback: string): Promise<{ success: boolean; classification: string; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/approvals/${approvalId}/request-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to request changes');
  }
  return res.json();
}

export async function retryStage(projectId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retry stage');
  }
  return res.json();
}

export async function advanceProject(id: string): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to advance project');
  }
  return res.json();
}

export async function pauseProject(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to pause project');
  }
  return res.json();
}

export async function resumeProject(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to resume project');
  }
  return res.json();
}

export async function endProject(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/projects/${id}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to end project');
  }
  return res.json();
}


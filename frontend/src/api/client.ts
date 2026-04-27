const BASE = import.meta.env.VITE_API_URL ?? '/api';

export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed';

export interface Deployment {
  id: string;
  gitUrl: string | null;
  sourceType: 'git' | 'tarball';
  status: DeploymentStatus;
  liveUrl: string | null;
  currentImageTagId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageTag {
  id: string;
  tag: string;
  registryRef: string;
  createdAt: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  return body.data as T;
}

export const api = {
  createDeployment: (gitUrl: string) =>
    request<Deployment>(`${BASE}/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gitUrl }),
    }),

  listDeployments: () =>
    request<Deployment[]>(`${BASE}/deployments`),

  getDeployment: (id: string) =>
    request<Deployment>(`${BASE}/deployments/${id}`),

  getImageTags: (id: string) =>
    request<ImageTag[]>(`${BASE}/deployments/${id}/tags`),

  redeploy: (id: string) =>
    request<void>(`${BASE}/deployments/${id}/redeploy`, { method: 'POST' }),

  rollback: (id: string, imageTagId: string) =>
    request<void>(`${BASE}/deployments/${id}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageTagId }),
    }),

  deleteDeployment: (id: string) =>
    request<void>(`${BASE}/deployments/${id}`, { method: 'DELETE' }),
};

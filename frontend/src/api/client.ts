const BASE = import.meta.env.VITE_API_URL ?? '/api';

export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed';

export interface Deployment {
  id: string;
  gitUrl: string | null;
  sourceType: 'git' | 'tarball';
  status: DeploymentStatus;
  liveUrl: string | null;
  currentImageTag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageTag {
  id: string;
  tag: string;
  registryRef: string;
  createdAt: string;
}

export const api = {
  async createDeployment(gitUrl: string): Promise<Deployment> {
    const res = await fetch(`${BASE}/deployments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gitUrl }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listDeployments(): Promise<Deployment[]> {
    const res = await fetch(`${BASE}/deployments`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getDeployment(id: string): Promise<Deployment> {
    const res = await fetch(`${BASE}/deployments/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getImageTags(deploymentId: string): Promise<ImageTag[]> {
    const res = await fetch(`${BASE}/deployments/${deploymentId}/tags`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async rollback(deploymentId: string, imageTagId: string): Promise<void> {
    const res = await fetch(`${BASE}/deployments/${deploymentId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageTagId }),
    });
    if (!res.ok) throw new Error(await res.text());
  },

  async redeploy(deploymentId: string): Promise<void> {
    const res = await fetch(`${BASE}/deployments/${deploymentId}/redeploy`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.text());
  },

  async deleteDeployment(deploymentId: string): Promise<void> {
    const res = await fetch(`${BASE}/deployments/${deploymentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
  },
};

import { runPipeline } from './pipeline';

// One active job per deployment — prevents concurrent builds racing on
// Caddy routes and the cache volume.
const activeLocks = new Map<string, Promise<void>>();

export function enqueue(deploymentId: string): void {
  if (activeLocks.has(deploymentId)) {
    console.warn(`[queue] ${deploymentId} already building — ignoring duplicate enqueue`);
    return;
  }

  const job = runPipeline(deploymentId)
    .catch(err => console.error(`[queue] Pipeline error for ${deploymentId}:`, err))
    .finally(() => activeLocks.delete(deploymentId));

  activeLocks.set(deploymentId, job);
}

export function isBuilding(deploymentId: string): boolean {
  return activeLocks.has(deploymentId);
}

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { db, Deployment } from '../db/queries';
import { caddyClient } from '../caddy/client';
import { dockerClient } from '../docker/client';
import { sseBroker } from '../sse/broker';
import { env } from '../env';

export async function runPipeline(deploymentId: string): Promise<void> {
  let sourceDir: string | null = null;
  let newContainerId: string | null = null;

  try {
    const deployment = await db.getDeployment(deploymentId);
    if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);

    await db.clearLogs(deploymentId);
    sourceDir = await prepareSource(deployment);

    // ── PHASE: building ────────────────────────────────────────────────
    await db.updateStatus(deploymentId, 'building');
    sseBroker.broadcast(deploymentId, { line: '=== Build started ===', phase: 'build' });

    const imageTag = `sha-${Date.now()}`;
    // Use a plain local name for Railpack — passing a registry-prefixed name causes
    // BuildKit to add a registry-push exporter alongside the docker export, which
    // hangs indefinitely because the host daemon can't resolve the Compose DNS name.
    const localImageName = `app-${deploymentId}:${imageTag}`;
    const registryRef = `${env.registryUrl}/app-${deploymentId}:${imageTag}`;
    const cacheKey = deployment.cache_key ?? null;

    await runRailpack(deploymentId, sourceDir, localImageName, cacheKey);

    // Tag the locally loaded image with the registry ref so Docker can find it
    // by registry name when running/rolling back.
    await dockerClient.tagImage(localImageName, registryRef);

    // Push to registry for rollback support. Best-effort with a hard timeout —
    // the Docker daemon may not be able to reach registry:5002 over the Compose
    // network from the host daemon, so we never let a stalled push block the deploy.
    try {
      await Promise.race([
        dockerClient.pushImage(registryRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('push timed out')), 15_000),
        ),
      ]);
    } catch (err: any) {
      writeLog(deploymentId, `[warn] registry push skipped: ${err.message}`, 'stderr', 'build');
    }

    const tagRecord = await db.createImageTag({
      deploymentId,
      tag: imageTag,
      registryRef,
      gitSha: null,
      builtBy: deploymentId,
    });

    // ── PHASE: deploying ───────────────────────────────────────────────
    await db.updateStatus(deploymentId, 'deploying');
    sseBroker.broadcast(deploymentId, { line: '=== Starting container ===', phase: 'deploy' });

    const oldContainerId = deployment.container_id;
    const hasExistingRoute = !!deployment.caddy_route_id;

    newContainerId = await dockerClient.runContainer(registryRef);
    const hostPort = await dockerClient.getHostPort(newContainerId);
    await dockerClient.healthCheck(newContainerId, hostPort);

    if (hasExistingRoute) {
      // Zero-downtime: record old container, atomically swap Caddy upstream, then drain old
      await db.updateDeployment(deploymentId, { prev_container_id: oldContainerId });
      await caddyClient.updateRoute(deploymentId, hostPort);
    } else {
      await caddyClient.addRoute(deploymentId, hostPort);
    }

    // ── PHASE: running ─────────────────────────────────────────────────
    const liveUrl = `http://localhost/deploys/${deploymentId}`;
    await db.updateDeployment(deploymentId, {
      status: 'running',
      container_id: newContainerId,
      host_port: hostPort,
      live_url: liveUrl,
      caddy_route_id: `deploy-${deploymentId}`,
      current_image_tag_id: tagRecord.id,
      prev_container_id: null,
    });

    // Stop old container only after DB is updated — Caddy already points to new container
    if (oldContainerId && hasExistingRoute) {
      await dockerClient.stopContainer(oldContainerId).catch(() => {});
    }

    sseBroker.broadcast(deploymentId, { line: `=== Running at ${liveUrl} ===`, phase: 'deploy' });
    sseBroker.close(deploymentId);

  } catch (err: any) {
    console.error(`[pipeline] ${deploymentId} failed:`, err.message);
    await db.updateStatus(deploymentId, 'failed').catch(() => {});

    if (newContainerId) {
      await dockerClient.stopContainer(newContainerId).catch(() => {});
    }

    sseBroker.broadcast(deploymentId, { line: `=== Failed: ${err.message} ===`, phase: 'build' });
    sseBroker.close(deploymentId);

  } finally {
    if (sourceDir) {
      await fs.rm(sourceDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ── Source preparation ─────────────────────────────────────────────────────

async function prepareSource(deployment: Deployment): Promise<string> {
  const dir = path.join('/app/uploads', `build-${deployment.id}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });

  if (deployment.source_type === 'git') {
    await cloneRepo(deployment.git_url!, dir);
  } else {
    throw new Error('Tarball uploads not yet implemented');
  }

  return dir;
}

async function cloneRepo(gitUrl: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['clone', '--depth', '1', gitUrl, targetDir]);

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('git clone timed out after 120s'));
    }, 120_000);

    proc.on('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`git clone failed with code ${code}: ${stderr.trim()}`));
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(new Error(`git not found in backend image: ${err.message}`));
    });
  });
}

// ── Railpack build ─────────────────────────────────────────────────────────

async function runRailpack(
  deploymentId: string,
  sourceDir: string,
  registryRef: string,
  cacheKey: string | null,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['build', '--name', registryRef];

    if (cacheKey) {
      args.push('--cache-key', cacheKey);
    }

    args.push('.');

    const proc = spawn('railpack', args, { cwd: sourceDir });

    // Drain stdout/stderr CONCURRENTLY with process exit — never buffer then drain.
    // Pipe fills at ~64KB; child blocks waiting to write and the backend hangs forever.
    proc.stdout.on('data', (chunk: Buffer) => {
      chunk.toString().split('\n').filter(Boolean).forEach(line => {
        writeLog(deploymentId, line, 'stdout', 'build');
      });
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      chunk.toString().split('\n').filter(Boolean).forEach(line => {
        writeLog(deploymentId, line, 'stderr', 'build');
      });
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Build timed out after ${env.buildTimeoutMinutes} minutes`));
    }, env.buildTimeoutMinutes * 60 * 1000);

    proc.on('exit', code => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`railpack exited with code ${code}`));
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn railpack: ${err.message}. Is it installed in the backend image?`));
    });
  });
}

async function writeLog(
  deploymentId: string,
  line: string,
  stream: 'stdout' | 'stderr',
  phase: 'build' | 'deploy',
) {
  const row = await db.insertLog({ deploymentId, line, stream, phase });
  sseBroker.broadcast(deploymentId, { id: row.id, line, phase });
}

// ── Rollback ───────────────────────────────────────────────────────────────

export async function runRollback(deploymentId: string, registryRef: string): Promise<void> {
  let newContainerId: string | null = null;

  try {
    const deployment = await db.getDeployment(deploymentId);
    if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);

    await db.clearLogs(deploymentId);
    await db.updateStatus(deploymentId, 'deploying');
    sseBroker.broadcast(deploymentId, { line: `=== Rolling back to ${registryRef} ===`, phase: 'deploy' });

    const oldContainerId = deployment.container_id;
    const hasExistingRoute = !!deployment.caddy_route_id;

    newContainerId = await dockerClient.runContainer(registryRef);
    const hostPort = await dockerClient.getHostPort(newContainerId);
    await dockerClient.healthCheck(newContainerId, hostPort);

    if (hasExistingRoute) {
      await db.updateDeployment(deploymentId, { prev_container_id: oldContainerId });
      await caddyClient.updateRoute(deploymentId, hostPort);
    } else {
      await caddyClient.addRoute(deploymentId, hostPort);
    }

    await db.updateDeployment(deploymentId, {
      status: 'running',
      container_id: newContainerId,
      host_port: hostPort,
      caddy_route_id: `deploy-${deploymentId}`,
      prev_container_id: null,
    });

    if (oldContainerId && hasExistingRoute) {
      await dockerClient.stopContainer(oldContainerId).catch(() => {});
    }

    sseBroker.broadcast(deploymentId, { line: '=== Rollback complete ===', phase: 'deploy' });
    sseBroker.close(deploymentId);

  } catch (err: any) {
    console.error(`[pipeline] rollback ${deploymentId} failed:`, err.message);
    await db.updateStatus(deploymentId, 'failed').catch(() => {});
    if (newContainerId) await dockerClient.stopContainer(newContainerId).catch(() => {});
    sseBroker.broadcast(deploymentId, { line: `=== Rollback failed: ${err.message} ===`, phase: 'deploy' });
    sseBroker.close(deploymentId);
  }
}

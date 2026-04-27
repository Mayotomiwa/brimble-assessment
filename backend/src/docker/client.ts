import Dockerode from 'dockerode';
import * as http from 'http';
import { env } from '../env';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      res.resume();
      resolve({ status: res.statusCode ?? 0 });
    }).on('error', reject);
  });
}

async function pullImage(registryRef: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    docker.pull(registryRef, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export const dockerClient = {
  async runContainer(registryRef: string): Promise<string> {
    // Try registry pull first (succeeds for rollback when image was previously pushed).
    // Has a hard timeout because the host Docker daemon can't resolve the registry
    // hostname via Compose DNS — if it can't pull, the image is already local.
    try {
      await Promise.race([
        pullImage(registryRef),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('pull timed out')), 15_000),
        ),
      ]);
    } catch {
      // image is in local store from Railpack's tarball export — createContainer will find it
    }

    const container = await docker.createContainer({
      Image: registryRef,
      HostConfig: {
        PublishAllPorts: true,
        RestartPolicy: { Name: 'no' },
      },
    });

    await container.start();
    return container.id;
  },

  async pushImage(registryRef: string): Promise<void> {
    const image = docker.getImage(registryRef);
    await new Promise<void>((resolve, reject) => {
      (image as any).push({}, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  },

  async getHostPort(containerId: string): Promise<number> {
    const info = await docker.getContainer(containerId).inspect();
    const ports = info.NetworkSettings.Ports;

    for (const binding of Object.values(ports)) {
      if (binding && binding.length > 0) {
        return parseInt(binding[0].HostPort, 10);
      }
    }

    throw new Error(`No port bindings found for container ${containerId}`);
  },

  async healthCheck(containerId: string, hostPort: number): Promise<void> {
    const url = `http://${env.dockerGatewayIp}:${hostPort}/`;

    for (let i = 0; i < env.healthCheckRetries; i++) {
      try {
        const res = await httpGet(url);
        if (res.status > 0 && res.status < 500) return;
      } catch { /* container not ready yet */ }
      await sleep(env.healthCheckInterval);
    }

    throw new Error(
      `Container ${containerId} failed health check after ${env.healthCheckRetries} retries`,
    );
  },

  async stopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: env.sigtermTimeout });
    } catch (err: any) {
      // 304 = already stopped, 404 = already removed — both are fine
      if (err?.statusCode !== 304 && err?.statusCode !== 404) throw err;
    }
    try {
      await container.remove({ force: true });
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err;
    }
  },
};

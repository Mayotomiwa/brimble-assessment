import * as http from 'http';
import { env } from '../env';

const ROUTES_PATH = '/config/apps/http/servers/srv0/routes';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function adminGet(path: string): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, env.caddyAdminUrl);
    http.get({ hostname: url.hostname, port: url.port, path: url.pathname }, (res) => {
      res.resume();
      resolve({ ok: (res.statusCode ?? 0) < 400, status: res.statusCode ?? 0 });
    }).on('error', reject);
  });
}

export async function waitForCaddy(retries = 10, delayMs = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await adminGet('/config/');
      if (res.ok) {
        console.log('[boot] Caddy admin API ready');
        return;
      }
    } catch {
      console.log(`[boot] Caddy not ready, retrying (${i + 1}/${retries})...`);
      await sleep(delayMs);
    }
  }
  console.error('[boot] Caddy never became ready — exiting');
  process.exit(1);
}

function buildRoute(deploymentId: string, hostPort: number) {
  return {
    '@id': `deploy-${deploymentId}`,
    match: [{ path: [`/deploys/${deploymentId}`, `/deploys/${deploymentId}/*`] }],
    handle: [
      {
        handler: 'subroute',
        routes: [{
          handle: [{
            handler: 'rewrite',
            uri_substring: [{ find: `/deploys/${deploymentId}`, replace: '' }],
          }],
        }],
      },
      {
        handler: 'reverse_proxy',
        upstreams: [{ dial: `${env.dockerGatewayIp}:${hostPort}` }],
      },
    ],
  };
}

export const caddyClient = {
  async addRoute(deploymentId: string, hostPort: number): Promise<string> {
    const res = await adminRequest('POST', ROUTES_PATH, buildRoute(deploymentId, hostPort));
    if (!res.ok) throw new Error(`Caddy addRoute failed: ${res.status} ${res.text}`);
    return `deploy-${deploymentId}`;
  },

  async updateRoute(deploymentId: string, newHostPort: number): Promise<void> {
    // DELETE all instances (handles duplicates from corrupted state), then POST fresh.
    // PUT /id/{id} fails with 400 "duplicate ID" if a previous broken update left two
    // routes with the same @id. DELETE + POST is simpler and avoids the GET-modify-PUT cycle.
    let deleted = true;
    while (deleted) {
      const res = await adminRequest('DELETE', `/id/deploy-${deploymentId}`);
      if (!res.ok && res.status !== 404) throw new Error(`Caddy updateRoute delete failed: ${res.status} ${res.text}`);
      deleted = res.ok;
    }
    const postRes = await adminRequest('POST', ROUTES_PATH, buildRoute(deploymentId, newHostPort));
    if (!postRes.ok) throw new Error(`Caddy updateRoute add failed: ${postRes.status} ${postRes.text}`);
  },

  async removeRoute(deploymentId: string): Promise<void> {
    // Loop to handle the case where duplicates exist.
    let deleted = true;
    while (deleted) {
      const res = await adminRequest('DELETE', `/id/deploy-${deploymentId}`);
      if (!res.ok && res.status !== 404) throw new Error(`Caddy removeRoute failed: ${res.status}`);
      deleted = res.ok;
    }
  },
};

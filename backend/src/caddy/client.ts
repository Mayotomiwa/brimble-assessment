import * as http from 'http';
import { env } from '../env';

const ROUTES_PATH = '/config/apps/http/servers/main/routes';

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

export const caddyClient = {
  async addRoute(deploymentId: string, hostPort: number): Promise<string> {
    const route = {
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

    const res = await adminRequest('POST', ROUTES_PATH, route);
    if (!res.ok) throw new Error(`Caddy addRoute failed: ${res.status} ${res.text}`);
    return `deploy-${deploymentId}`;
  },

  async updateRoute(deploymentId: string, newHostPort: number): Promise<void> {
    const routeId = `deploy-${deploymentId}`;
    const getRes = await adminRequest('GET', `${ROUTES_PATH}/.../${routeId}`);
    if (!getRes.ok) throw new Error(`Caddy updateRoute GET failed: ${getRes.status} ${getRes.text}`);
    const route = JSON.parse(getRes.text);
    const proxyHandle = (route.handle as any[])?.find((h: any) => h.handler === 'reverse_proxy');
    if (proxyHandle) {
      proxyHandle.upstreams[0].dial = `${env.dockerGatewayIp}:${newHostPort}`;
    }
    const putRes = await adminRequest('PUT', `${ROUTES_PATH}/.../${routeId}`, route);
    if (!putRes.ok) throw new Error(`Caddy updateRoute PUT failed: ${putRes.status} ${putRes.text}`);
  },

  async removeRoute(deploymentId: string): Promise<void> {
    const res = await adminRequest('DELETE', `${ROUTES_PATH}/.../deploy-${deploymentId}`);
    if (!res.ok && res.status !== 404) {
      throw new Error(`Caddy removeRoute failed: ${res.status}`);
    }
  },
};

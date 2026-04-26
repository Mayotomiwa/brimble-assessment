import * as http from 'http';
import { env } from '../env';

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

// Route management — implemented per phase
export const caddyClient = {
  async addRoute(_deploymentId: string, _hostPort: number): Promise<string> {
    return '';
  },
  async updateRoute(_deploymentId: string, _newHostPort: number): Promise<void> {},
  async removeRoute(_deploymentId: string): Promise<void> {},
};

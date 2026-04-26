import { env } from '../env';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForCaddy(retries = 10, delayMs = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${env.caddyAdminUrl}/config/`);
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

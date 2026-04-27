import { Pool } from 'pg';
import { env } from '../env';

let _pool: Pool | null = null;

function pool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: env.databaseUrl });
  return _pool;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'running' | 'failed';

export interface Deployment {
  id: string;
  git_url: string | null;
  source_type: 'git' | 'tarball';
  status: DeploymentStatus;
  current_image_tag_id: string | null;
  container_id: string | null;
  prev_container_id: string | null;
  host_port: number | null;
  live_url: string | null;
  caddy_route_id: string | null;
  cache_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ImageTag {
  id: string;
  deployment_id: string;
  tag: string;
  registry_ref: string;
  git_sha: string | null;
  built_by: string | null;
  created_at: Date;
}

export interface Log {
  id: string;
  deployment_id: string;
  line: string;
  stream: 'stdout' | 'stderr';
  phase: 'build' | 'deploy';
  ts: Date;
}

// ── Deployments ────────────────────────────────────────────────────────────

export const db = {
  async createDeployment(input: {
    gitUrl: string | null;
    sourceType: 'git' | 'tarball';
    cacheKey: string | null;
  }): Promise<Deployment> {
    const { rows } = await pool().query<Deployment>(
      `INSERT INTO deployments (git_url, source_type, cache_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.gitUrl, input.sourceType, input.cacheKey],
    );
    return rows[0];
  },

  async listDeployments(): Promise<Deployment[]> {
    const { rows } = await pool().query<Deployment>(
      `SELECT * FROM deployments ORDER BY created_at DESC`,
    );
    return rows;
  },

  async getDeployment(id: string): Promise<Deployment | null> {
    const { rows } = await pool().query<Deployment>(
      `SELECT * FROM deployments WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async updateStatus(id: string, status: DeploymentStatus): Promise<void> {
    await pool().query(
      `UPDATE deployments SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );
  },

  async updateDeployment(
    id: string,
    updates: Partial<Pick<Deployment,
      | 'status' | 'container_id' | 'prev_container_id'
      | 'host_port' | 'live_url' | 'caddy_route_id' | 'current_image_tag_id'
    >>,
  ): Promise<void> {
    const fields = Object.keys(updates) as (keyof typeof updates)[];
    if (fields.length === 0) return;
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map(f => updates[f]);
    await pool().query(
      `UPDATE deployments SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1}`,
      [...values, id],
    );
  },

  async deleteDeployment(id: string): Promise<void> {
    await pool().query(`DELETE FROM logs WHERE deployment_id = $1`, [id]);
    await pool().query(`DELETE FROM image_tags WHERE deployment_id = $1`, [id]);
    await pool().query(`DELETE FROM deployments WHERE id = $1`, [id]);
  },

  // ── Image Tags ─────────────────────────────────────────────────────────

  async createImageTag(input: {
    deploymentId: string;
    tag: string;
    registryRef: string;
    gitSha: string | null;
    builtBy: string;
  }): Promise<ImageTag> {
    const { rows } = await pool().query<ImageTag>(
      `INSERT INTO image_tags (deployment_id, tag, registry_ref, git_sha, built_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.deploymentId, input.tag, input.registryRef, input.gitSha, input.builtBy],
    );
    return rows[0];
  },

  async listImageTags(deploymentId: string): Promise<ImageTag[]> {
    const { rows } = await pool().query<ImageTag>(
      `SELECT * FROM image_tags WHERE deployment_id = $1 ORDER BY created_at DESC`,
      [deploymentId],
    );
    return rows;
  },

  async getImageTag(id: string): Promise<ImageTag | null> {
    const { rows } = await pool().query<ImageTag>(
      `SELECT * FROM image_tags WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  // ── Logs ───────────────────────────────────────────────────────────────

  async insertLog(input: {
    deploymentId: string;
    line: string;
    stream: 'stdout' | 'stderr';
    phase: 'build' | 'deploy';
  }): Promise<Log> {
    const { rows } = await pool().query<Log>(
      `INSERT INTO logs (deployment_id, line, stream, phase)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.deploymentId, input.line, input.stream, input.phase],
    );
    return rows[0];
  },

  async getLogs(
    deploymentId: string,
    opts: { afterId?: string } = {},
  ): Promise<Log[]> {
    if (opts.afterId) {
      const { rows } = await pool().query<Log>(
        `SELECT * FROM logs
         WHERE deployment_id = $1
           AND ts > (SELECT ts FROM logs WHERE id = $2)
         ORDER BY ts ASC`,
        [deploymentId, opts.afterId],
      );
      return rows;
    }
    const { rows } = await pool().query<Log>(
      `SELECT * FROM logs WHERE deployment_id = $1 ORDER BY ts ASC`,
      [deploymentId],
    );
    return rows;
  },
};

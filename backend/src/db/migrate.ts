import { Pool } from 'pg';
import { env } from '../env';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForDb(retries = 10, delayMs = 1000): Promise<void> {
  const pool = new Pool({ connectionString: env.databaseUrl });
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      await pool.end();
      console.log('[boot] DB ready');
      return;
    } catch {
      console.log(`[boot] DB not ready, retrying (${i + 1}/${retries})...`);
      await sleep(delayMs);
    }
  }
  console.error('[boot] DB never became ready — exiting');
  process.exit(1);
}

export async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        git_url               TEXT,
        source_type           TEXT NOT NULL DEFAULT 'git',
        status                TEXT NOT NULL DEFAULT 'pending',
        current_image_tag_id  UUID,
        container_id          TEXT,
        prev_container_id     TEXT,
        host_port             INTEGER,
        live_url              TEXT,
        caddy_route_id        TEXT,
        cache_key             TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS image_tags (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deployment_id  UUID NOT NULL REFERENCES deployments(id),
        tag            TEXT NOT NULL,
        registry_ref   TEXT NOT NULL,
        git_sha        TEXT,
        built_by       TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS logs (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deployment_id  UUID NOT NULL REFERENCES deployments(id),
        line           TEXT NOT NULL,
        stream         TEXT NOT NULL DEFAULT 'stdout',
        phase          TEXT NOT NULL DEFAULT 'build',
        ts             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS logs_deployment_id_idx ON logs(deployment_id);
      CREATE INDEX IF NOT EXISTS image_tags_deployment_id_idx ON image_tags(deployment_id);
    `);
    console.log('[boot] Migrations complete');
  } finally {
    await pool.end();
  }
}

# Brimble Deploy

A self-contained deployment pipeline. Submit a Git URL, watch it build into a container via Railpack, and get a live URL — all streamed in real time.

---

## Quick Start

```bash
docker compose up --build
```

Then open **http://localhost**.

> **Mac / Windows Docker Desktop:** the default `DOCKER_GATEWAY_IP` is `172.17.0.1` (Linux bridge). Create a `.env` file in the repo root before starting:
> ```bash
> DOCKER_GATEWAY_IP=host.docker.internal
> ```
> Compose reads `.env` automatically.

---

## Testing with the sample app

A minimal Node.js app lives in `sample-app/`. Push it to a public GitHub repo and paste the URL into the deploy form, or fork any public repo.

---

## Architecture

Five services wired together via docker-compose — **no manual setup required**:

| Service | Role |
|---------|------|
| `frontend` | Vite + React UI on port 80 (via Caddy) |
| `backend` | NestJS API + in-process worker on port 3000 |
| `caddy` | Single ingress on :80; user container routes added dynamically |
| `db` | PostgreSQL 16 — deployments, image tags, build logs |
| `registry` | Local OCI registry at `registry:5002` — stores all built images |

Build logs stream live over SSE. The backend reconnects automatically on page refresh using `Last-Event-ID`.

---

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/deployments` | Create — body `{ gitUrl }` → 202 + id |
| `GET` | `/api/deployments` | List all, newest first |
| `GET` | `/api/deployments/:id` | Single deployment |
| `DELETE` | `/api/deployments/:id` | Stop container + remove route |
| `POST` | `/api/deployments/:id/redeploy` | Rebuild from same source |
| `POST` | `/api/deployments/:id/rollback` | Body `{ imageTagId }` — skip build, swap image |
| `GET` | `/api/deployments/:id/tags` | All built image tags |
| `GET` | `/api/deployments/:id/logs` | SSE log stream |
| `GET` | `/api/healthz` | Health check |

---

## Build Cache

The first build of a repo is cold — Railpack fetches and compiles everything from scratch. Subsequent builds of the same Git URL hit the registry layer cache, reducing build time significantly (e.g. 2 minutes → 20 seconds for a typical Node app).

The cache key is a SHA-256 of the Git URL. It's stored per deployment and passed to Railpack as `--cache-from` / `--cache-to` with `mode=max`, which caches all intermediate layers — not just the final image.

Cache layers persist in the `registry_data` Docker volume across restarts.

---

## Zero-Downtime Redeploy

During a redeploy, the old and new containers run simultaneously for a brief period:

1. New container starts and passes its health check
2. Caddy's upstream is atomically swapped to the new container — no request gap
3. The old container receives `SIGTERM` and has `SIGTERM_TIMEOUT` seconds (default 10) to drain in-flight requests before being stopped

This means zero requests are dropped during a redeploy.

---

## Rollback

Every successful build saves an image tag to the local registry. The UI shows the full tag history for each deployment. Clicking **Rollback** pulls the existing image — no rebuild — and performs the same zero-downtime swap as a redeploy.

---

## Reset Commands

```bash
# Full clean reset — deletes all data, images, and volumes
docker compose down -v --remove-orphans && docker compose up --build

# Soft restart — keeps DB and registry data (faster)
docker compose down && docker compose up --build

# Rebuild just the backend during development
docker compose up --build backend
```

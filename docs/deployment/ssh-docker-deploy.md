# SSH Docker Deployment

This document describes the live Docker-based production deployment currently running on the production host for ClubCRM.

## Current Status

The current deployment is live and DNS is already cut over.

- `https://clubcrm.org` is serving the production web app behind Caddy
- `https://www.clubcrm.org` is also serving the production web app
- `https://clubcrm.org/api/health` returns the backend health payload
- `https://clubcrm.org/system/health` renders the frontend diagnostics page

Current externally visible behavior:

- the site root redirects by backend auth state, landing on `/dashboard`, `/not-provisioned`, or `/login`
- Caddy terminates TLS for both the apex and `www` hostnames
- `/api/*` is proxied to the FastAPI container
- all other traffic is proxied to the Next.js web container

## Runtime Shape

The current production stack now brings up the same backing services the app expects on the internal Docker network:

- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`
- `caddy`

The data services stay internal to the Compose network and persist their data in named Docker volumes on the deploy host. Only `caddy` exposes public ports.

## Files

- [`apps/web/Dockerfile`](../../apps/web/Dockerfile) builds the Next.js app as a standalone production image.
- [`apps/api/Dockerfile`](../../apps/api/Dockerfile) builds the FastAPI app image.
- [`infra/docker-compose.production.yml`](../../infra/docker-compose.production.yml) runs the full production stack, including the backing data services.
- [`infra/Caddyfile`](../../infra/Caddyfile) fronts the app and proxies `/api/*` to the backend.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) verifies the repo on GitHub Actions and, after `main` passes verification, builds the production images, streams them to the deploy host over SSH, then asks the server to pull the latest repo state and restart the stack.

## Server Expectations

The deploy host should have:

- Docker Engine
- Docker Compose plugin
- a checkout at `/opt/clubcrm`
- a read-only GitHub deploy key at `~/.ssh/clubcrm-repo`
- a deploy user that either has direct Docker access or can run `sudo -n docker` and `sudo -n docker compose` without an interactive password prompt
- a production environment file at `/opt/clubcrm/.env.production`

## GitHub Actions Secrets

The `deploy-production` workflow expects these repository-level GitHub Actions secrets:

- `DEPLOY_SSH_KEY`: the private SSH key GitHub Actions uses to connect to the deploy host
- `DEPLOY_HOST`: the deploy host public IP address or DNS name, without `https://` or any other URL scheme. Prefer the stable production hostname (`clubcrm.org`) over a raw IP so host rotations do not strand deployments on an old address.
- `DEPLOY_USER`: the Linux user GitHub Actions should connect as

If any of those secrets are missing or blank, the workflow now fails during `Configure SSH` with a targeted error message before it tries to open the connection.
If `DEPLOY_HOST` is omitted or stops responding on port `22`, the workflow now falls back to `clubcrm.org` before it gives up.
If `Configure SSH` still fails after the secrets are present, verify that `DEPLOY_HOST` resolves publicly and that the deploy host accepts SSH connections on port `22` from GitHub Actions runners.

## Production Environment

Create `/opt/clubcrm/.env.production` from [`.env.production.example`](../../.env.production.example) and keep at least these values set:

```dotenv
DOMAIN=clubcrm.org
SERVER_IP=31.97.142.155
API_BASE_URL=http://api:8000
WEB_IMAGE=clubcrm-web:deploy
API_IMAGE=clubcrm-api:deploy
POSTGRES_DB=clubcrm
POSTGRES_USER=clubcrm
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://clubcrm:change-me@postgres:5432/clubcrm
MONGODB_URL=mongodb://mongodb:27017/clubcrm
REDIS_URL=redis://redis:6379/0
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
```

## Deployment Flow

Production deploys are handled by the `deploy-production` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- GitHub Actions first runs `pnpm verify`
- only successful pushes to `main` continue to deployment
- the deploy job builds the `web` and `api` images
- the API image includes the checked-in Alembic config and applies `alembic upgrade head` before
  Uvicorn starts, so a fresh production PostgreSQL volume gets the current schema during rollout
- the workflow verifies SSH access, then streams those images to the deploy host over SSH and loads them with Docker, falling back to `sudo -n` when the deploy user is not in the `docker` group
- the workflow now tries the configured `DEPLOY_HOST` first and falls back to `clubcrm.org` when the configured host no longer answers SSH host-key discovery on port `22`
- the host pulls the latest repo state in `/opt/clubcrm`
- `docker compose -f infra/docker-compose.production.yml up -d --remove-orphans` refreshes the stack, with a `sudo -n` fallback when direct Docker access is unavailable

This keeps the production artifact centered on Docker images, which makes the future move to
Kubernetes mainly a deployment-target change. The verification step and image-build boundary can stay
the same even when the final rollout command later changes from `docker compose` to Kubernetes
manifests or Helm.

## DNS and TLS

DNS is already pointed at the deploy host, so Caddy can serve live certificates for:

- `clubcrm.org`
- `www.clubcrm.org`

If DNS is changed again or certificates need to be reacquired, rerun:

```bash
docker compose -f infra/docker-compose.production.yml up -d
```

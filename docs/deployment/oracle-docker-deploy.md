# Oracle Docker Deployment

This document describes the live lightweight production deployment currently running on the Oracle Cloud VM for ClubCRM.

## Current Status

The Oracle deployment is now live and DNS is already cut over.

- `https://clubcrm.org` is serving the production web app behind Caddy
- `https://www.clubcrm.org` is also serving the production web app
- `https://clubcrm.org/api/health` returns the backend health payload
- `https://clubcrm.org/system/health` renders the frontend diagnostics page

Current externally visible behavior:

- the site root redirects to `/dashboard`
- Caddy terminates TLS for both the apex and `www` hostnames
- `/api/*` is proxied to the FastAPI container
- all other traffic is proxied to the Next.js web container

## Why This Shape

The current Oracle host is a small Ubuntu VM, so the production deployment keeps the runtime footprint focused on:

- `web`
- `api`
- `caddy`

The local development-only backing services in [`infra/docker-compose.yml`](../../infra/docker-compose.yml) are intentionally excluded from this production stack because the currently deployed backend still only exposes `/health`, and the frontend only needs `API_BASE_URL` for the diagnostics surface on `/system/health`.

## Files

- [`apps/web/Dockerfile`](../../apps/web/Dockerfile) builds the Next.js app as a standalone production image.
- [`apps/api/Dockerfile`](../../apps/api/Dockerfile) builds the FastAPI app image.
- [`infra/docker-compose.production.yml`](../../infra/docker-compose.production.yml) runs `web`, `api`, and `caddy`.
- [`infra/Caddyfile`](../../infra/Caddyfile) fronts the app and proxies `/api/*` to the backend.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) verifies the repo on GitHub Actions and, after `main` passes verification, builds the production images, streams them to the Oracle host over SSH, then asks the server to pull the latest repo state and restart the stack.

## Server Expectations

The Oracle host should have:

- Docker Engine
- Docker Compose plugin
- a checkout at `/opt/clubcrm`
- a read-only GitHub deploy key at `~/.ssh/clubcrm-repo`
- a production environment file at `/opt/clubcrm/.env.production`

## Production Environment

Create `/opt/clubcrm/.env.production` from [`.env.production.example`](../../.env.production.example) and keep at least these values set:

```dotenv
DOMAIN=clubcrm.org
SERVER_IP=150.136.162.122
API_BASE_URL=http://api:8000
WEB_IMAGE=clubcrm-web:deploy
API_IMAGE=clubcrm-api:deploy
```

## Deployment Flow

Production deploys are handled by the `deploy-production` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- GitHub Actions first runs `pnpm verify`
- only successful pushes to `main` continue to deployment
- the deploy job builds the `web` and `api` images
- the workflow streams those images to the Oracle host over SSH
- the host pulls the latest repo state in `/opt/clubcrm`
- `docker compose -f infra/docker-compose.production.yml up -d --remove-orphans` refreshes the stack

This keeps the production artifact centered on Docker images, which makes the future move to
Kubernetes mainly a deployment-target change. The verification step and image-build boundary can stay
the same even when the final rollout command later changes from `docker compose` to Kubernetes
manifests or Helm.

## DNS and TLS

DNS is already pointed at the Oracle host, so Caddy can serve live certificates for:

- `clubcrm.org`
- `www.clubcrm.org`

If DNS is changed again or certificates need to be reacquired, rerun:

```bash
docker compose -f infra/docker-compose.production.yml up -d
```

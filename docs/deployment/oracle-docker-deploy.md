# Oracle Docker Deployment

This document describes the live Docker-based production deployment currently running on the Oracle Cloud VM for ClubCRM.

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

## Runtime Shape

The current production stack now brings up the same backing services the app expects on the internal Docker network:

- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`
- `caddy`

The data services stay internal to the Compose network and persist their data in named Docker volumes on the Oracle host. Only `caddy` exposes public ports.

## Files

- [`apps/web/Dockerfile`](../../apps/web/Dockerfile) builds the Next.js app as a standalone production image.
- [`apps/api/Dockerfile`](../../apps/api/Dockerfile) builds the FastAPI app image.
- [`infra/docker-compose.production.yml`](../../infra/docker-compose.production.yml) runs the full production stack, including the backing data services.
- [`infra/Caddyfile`](../../infra/Caddyfile) fronts the app and proxies `/api/*` to the backend.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) verifies the repo on GitHub Actions and, after `main` passes verification, builds the production images, streams them to the Oracle host over SSH, then asks the server to pull the latest repo state and restart the stack.

## Server Expectations

The Oracle host should have:

- Docker Engine
- Docker Compose plugin
- a checkout at `/opt/clubcrm`
- a read-only GitHub deploy key at `~/.ssh/clubcrm-repo`
- a deploy user that either has direct Docker access or can run `sudo -n docker` and `sudo -n docker compose` without an interactive password prompt
- a production environment file at `/opt/clubcrm/.env.production`

## GitHub Actions Secrets

The `deploy-production` workflow expects these repository-level GitHub Actions secrets:

- `OCI_DEPLOY_SSH_KEY`: the private SSH key GitHub Actions uses to connect to the Oracle host
- `OCI_HOST`: the Oracle host public IP address or DNS name, without `https://` or any other URL scheme
- `OCI_USER`: the Linux user GitHub Actions should connect as

If any of those secrets are missing or blank, the workflow now fails during `Configure SSH` with a targeted error message before it tries to open the connection.

## Production Environment

Create `/opt/clubcrm/.env.production` from [`.env.production.example`](../../.env.production.example) and keep at least these values set:

```dotenv
DOMAIN=clubcrm.org
SERVER_IP=150.136.162.122
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
- the workflow verifies SSH access, then streams those images to the Oracle host over SSH and loads them with Docker, falling back to `sudo -n` when the deploy user is not in the `docker` group
- the host pulls the latest repo state in `/opt/clubcrm`
- `docker compose -f infra/docker-compose.production.yml up -d --remove-orphans` refreshes the stack, with a `sudo -n` fallback when direct Docker access is unavailable

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

# Oracle Docker Deployment

This document describes the lightweight production deployment used for the current Oracle Cloud VM.

## Why This Shape

The current Oracle host is a small Ubuntu VM, so the production deployment keeps the runtime footprint focused on:

- `web`
- `api`
- `caddy`

The local development-only backing services in [`infra/docker-compose.yml`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/infra/docker-compose.yml) are intentionally excluded from this production stack because the current app only needs the API health endpoint and the web app's `API_BASE_URL`.

## Files

- [`apps/web/Dockerfile`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/apps/web/Dockerfile) builds the Next.js app as a standalone production image.
- [`apps/api/Dockerfile`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/apps/api/Dockerfile) builds the FastAPI app image.
- [`infra/docker-compose.production.yml`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/infra/docker-compose.production.yml) runs `web`, `api`, and `caddy`.
- [`infra/Caddyfile`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/infra/Caddyfile) fronts the app and proxies `/api/*` to the backend.
- [`.github/workflows/deploy-oci.yml`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/.github/workflows/deploy-oci.yml) builds images on GitHub Actions, streams them to the Oracle host over SSH, then asks the server to pull the latest repo state and restart the stack.

## Server Expectations

The Oracle host should have:

- Docker Engine
- Docker Compose plugin
- a checkout at `/opt/clubcrm`
- a read-only GitHub deploy key at `~/.ssh/clubcrm-repo`
- a production environment file at `/opt/clubcrm/.env.production`

## Production Environment

Create `/opt/clubcrm/.env.production` from [`.env.production.example`](/Users/michaelolave/Projects/active/ClubCRM-codex-deploy/.env.production.example) and keep at least these values set:

```dotenv
DOMAIN=clubcrm.org
SERVER_IP=150.136.162.122
API_BASE_URL=http://api:8000
WEB_IMAGE=clubcrm-web:deploy
API_IMAGE=clubcrm-api:deploy
```

## DNS Cutover

`clubcrm.org` currently resolves to Vercel, so Caddy cannot obtain the live certificate for the Oracle host until DNS is updated.

When you are ready to cut over:

- point the `A` record for `clubcrm.org` to `150.136.162.122`
- point `www.clubcrm.org` to the same host or redirect it at the DNS layer
- wait for DNS to propagate
- rerun `docker compose -f infra/docker-compose.production.yml up -d` on the host if you need to force a Caddy retry

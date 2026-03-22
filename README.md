# ClubCRM

ClubCRM is a devcontainer-first monorepo for a club management platform with:

- Next.js web app
- FastAPI API
- PostgreSQL for relational data
- MongoDB for document-style form submissions
- Redis for caching and short-lived data
- Kafka for domain events and async workflows

Current implementation status:

- `apps/web` renders a health-check page that probes the API
- `apps/api` exposes `GET /health`
- the local data and app stack is wired up through the repository devcontainer

## Development Environment

All development is expected to happen inside the repository devcontainer.

Before opening the devcontainer, create the local environment file that the Compose services read:

```bash
cp .env.example .env
```

Then open the repository in the devcontainer. The devcontainer uses:

- `infra/docker-compose.yml`
- `.devcontainer/docker-compose.devcontainer.yml`

When the devcontainer starts, it:

- mounts the repository at `/workspace`
- starts the `workspace`, `web`, `api`, `postgres`, `mongodb`, `redis`, and `kafka` services
- runs `.devcontainer/post-create.sh`
- bootstraps dependencies with `pnpm bootstrap`

Available services:

- `workspace`
- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

Forwarded ports:

- `3000` web
- `8000` api
- `5432` postgres
- `27017` mongodb
- `6379` redis
- `9092` kafka

The `web` and `api` development servers are already started by the devcontainer Compose stack. Use the root scripts below only when you intentionally restart a service from the workspace terminal, run checks manually, or debug outside the default process.

## Quality Checks

From inside the devcontainer workspace:

Bootstrap dependencies and install Git hooks again if needed:

```bash
pnpm bootstrap
```

Run all configured Git hooks manually:

```bash
apps/api/.venv/bin/pre-commit run --all-files
```

Run repository checks locally:

```bash
pnpm verify
```

Manual app entrypoints:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev
```

These commands are for manual restart or debugging from the devcontainer terminal. They are not required for the normal first-run workflow because the devcontainer already starts the app services.

## Docs

- `docs/contributing.md` for contribution workflow and code standards
- `docs/architecture.md` for system structure and local environment rules
- `docs/schema.md` for data modeling notes
- `docs/decisions.md` for architecture decisions
- `docs/team-execution-plan.md` for scope and ownership guidance

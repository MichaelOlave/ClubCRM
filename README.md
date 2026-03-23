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

The Compose stack loads defaults from `.env.example`. If you need to override any local settings, create a root `.env` before opening the devcontainer:

```bash
cp .env.example .env
```

If you do not create `.env`, the checked-in example values are used automatically. Then open the repository in the devcontainer. The devcontainer uses:

- `infra/docker-compose.yml`
- `.devcontainer/docker-compose.devcontainer.yml`
- `.devcontainer/docker-compose.ports.yml` generated during startup

The repository enforces LF line endings for devcontainer and shell files so the same checkout works on macOS and Windows hosts. Devcontainer startup no longer depends on checked-out shell scripts, so you should not need any host-side normalization step just to open the environment.

When the devcontainer starts, it:

- generates `.devcontainer/docker-compose.ports.yml` with the first available host port for each required service
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

- `3000` or the next available port for web
- `8000` or the next available port for api
- `5432` or the next available port for postgres
- `27017` or the next available port for mongodb
- `6379` or the next available port for redis
- `9092` or the next available port for kafka

If a default host port is already in use, the devcontainer remaps that service to the next free port such as `3001`. The resolved host-port bindings are written to `.devcontainer/docker-compose.ports.yml` during startup.

The `web` and `api` development servers are already started by the devcontainer Compose stack. Use the root scripts below only when you intentionally restart a service from the workspace terminal, run checks manually, or debug outside the default process.

## Quality Checks

From inside the devcontainer workspace:

Bootstrap dependencies and install Git hooks again if needed:

```bash
pnpm bootstrap
```

The root `pnpm` scripts are the cross-platform contract. They resolve the right Python launcher and virtualenv paths for the current OS, so prefer them over calling `.venv/bin/...` or shell scripts directly.

Run all configured Git hooks manually:

```bash
pnpm precommit:all
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

## Git Workflow

Use Git with a simple default: one logical change per branch and one focused pull request per branch.

- Create a new branch for each feature, bug fix, non-trivial refactor, docs or workflow update, or cross-app API contract change.
- Keep unrelated work out of the same branch, even inside this monorepo.
- If a change touches both `apps/web` and `apps/api` but is still one coherent feature or contract update, keep it in one branch and one pull request.
- If you are changing setup, ports, service assumptions, repo structure, or the health-check flow, isolate that work in its own branch and update docs in the same pull request.

Commits are checkpoints inside a branch. Prefer a few small, descriptive commits over one large mixed-purpose commit.

- Separate refactors from behavior changes when practical.
- Keep commit messages specific to the actual change.
- Group related documentation updates with the behavior or workflow change they explain unless the docs work is large enough to stand on its own.

Before opening a pull request, run the narrowest relevant checks from the repository root and include a short verification summary in the pull request description.

## Docs

- `docs/contributing.md` for contribution workflow and code standards
- `docs/architecture.md` for system structure and local environment rules
- `docs/schema.md` for data modeling notes
- `docs/decisions.md` for architecture decisions
- `docs/team-execution-plan.md` for scope and ownership guidance

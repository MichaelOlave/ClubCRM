# ClubCRM

ClubCRM is a devcontainer-first monorepo for a club management platform with:

- Next.js web app
- FastAPI API
- PostgreSQL for relational data
- MongoDB for document-style form submissions
- Redis for caching and short-lived data
- Kafka for domain events and async workflows

Current implementation status:

- `apps/web` now provides a UI-first MVP: `/` sends authenticated users to `/dashboard` and everyone else to `/login`, admin pages live under `src/app/(app)`, and public entry points live under `src/app/(public)`
- the frontend currently includes dashboard, profile, club and member directory/detail pages, club and member creation and update flows, roster assignment from club detail, a `/login` route that hands off to backend-owned auth, join-form previews, and a public `/system/health` diagnostics route
- `apps/api` now includes bootstrap, config, infrastructure, module, and test layers, plus live `GET /health` and backend-owned auth session routes under `/auth`; the rest of the frontend still stays ahead of the broader backend contract
- the admin route group now checks the backend session before rendering and redirects unauthenticated requests to `/login`
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

The repository enforces LF line endings for devcontainer and workflow files so the same checkout works on macOS and Windows hosts. Devcontainer startup no longer depends on host-specific wrapper scripts, so you should not need any host-side normalization step just to open the environment.

When the devcontainer starts, it:

- generates `.devcontainer/docker-compose.ports.yml` with the first available host port for each required service
- mounts the repository at `/workspace`
- starts the `workspace`, `web`, `api`, `postgres`, `mongodb`, `redis`, and `kafka` services
- runs the devcontainer `postCreateCommand` (`python3 ./scripts/bootstrap.py`)
- bootstraps dependencies with `pnpm bootstrap`, which prefers `uv` for API Python packages and falls back to the virtualenv's `pip` when `uv` is unavailable
- exposes localhost TCP proxies inside the attached `workspace` container so editor-driven forwarding from `127.0.0.1` reaches the sibling `web`, `api`, and data services

To keep local I/O fast on bind-mounted workspaces, the devcontainer persists the PNPM store, workspace
`node_modules`, web `node_modules`, web `.next`, and the API virtualenv in Docker volumes. The `api`
and `web` services also wait for their dependencies to report healthy before they start.

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

The repository now tracks a minimal VS Code workspace setting and Tailwind CSS custom-data file so Tailwind v4 directives used in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) do not show false "unknown at rule" diagnostics in editors that use the VS Code CSS language service.

## Quality Checks

From inside the devcontainer workspace:

Bootstrap dependencies and install Git hooks again if needed:

```bash
pnpm bootstrap
```

The root `pnpm` scripts are the cross-platform contract. They resolve the right Python launcher and virtualenv paths for the current OS, so prefer them over calling `.venv/bin/...` or app runtimes directly.
They also do not require a separate host-side `uv` install just to bootstrap the API environment.

Run all configured Git hooks manually:

```bash
pnpm precommit:all
```

Run repository checks locally:

```bash
pnpm verify
```

For backend-only sanity checks, `pnpm check:api` currently bytecode-compiles `apps/api/src`. Use
`pnpm lint:api` and `pnpm format:api:check` for Ruff-based lint and formatting checks.

Manual app entrypoints:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev
```

These commands are for manual restart or debugging from the devcontainer terminal. They are not required for the normal first-run workflow because the devcontainer already starts the app services.

In the current devcontainer workflow, the web development server uses `next dev --webpack` to avoid a Tailwind/Turbopack workspace resolution issue during local startup. Production builds still use `next build`.
The API development server now limits reload watching to `apps/api/src`, runs Alembic migrations before startup, and forces polling so Windows-hosted devcontainers and WSL-backed file mounts stay more reliable during startup and code reloads.

## Git Workflow

Use Git with a simple default: one logical change per branch and one focused pull request per branch.

- Create a new branch for each feature, bug fix, non-trivial refactor, docs or workflow update, or cross-app API contract change.
- Keep unrelated work out of the same branch, even inside this monorepo.
- If a change touches both `apps/web` and `apps/api` but is still one coherent feature or contract update, keep it in one branch and one pull request.
- If you are changing setup, ports, service assumptions, repo structure, or the diagnostics and health-check flow, isolate that work in its own branch and update docs in the same pull request.

Commits are checkpoints inside a branch. Prefer a few small, descriptive commits over one large mixed-purpose commit.

- Separate refactors from behavior changes when practical.
- Keep commit messages specific to the actual change.
- Group related documentation updates with the behavior or workflow change they explain unless the docs work is large enough to stand on its own.

Before opening a pull request, run the narrowest relevant checks from the repository root and include a short verification summary in the pull request description.

## Docs

- `docs/README.md` for a categorized map of the project documentation
- `docs/contributing.md` for contribution workflow and code standards
- `docs/architecture.md` for system structure and local environment rules
- `docs/schema.md` for data modeling notes
- `docs/decisions.md` for architecture decisions
- `docs/guides/module-implementation-flow.md` for step-by-step guidance on growing a module or feature slice
- `docs/guides/postgresql-implementation-flow.md` for relational system-of-record implementation guidance
- `docs/guides/mongodb-implementation-flow.md` for document-store implementation guidance
- `docs/guides/redis-implementation-flow.md` for caching and short-lived data implementation guidance
- `docs/guides/kafka-implementation-flow.md` for async event publication implementation guidance
- `docs/plans/team-execution-plan.md` for scope and ownership guidance
- `docs/plans/networking-team-execution-plan.md` for the companion networking workstream
- `docs/deployment/ssh-docker-deploy.md` for the current SSH-based VM deployment path
- `docs/analysis/current-project-structure-analysis.md` for a detailed review of the repo's current shape
- `docs/proposals/` for course proposal drafts

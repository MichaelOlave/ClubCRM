<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This app uses Next.js `16.2.1` and React `19.2.4`. APIs, conventions, and defaults may differ from older training data.

Before making framework-level changes, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Web App Agent Guide

This file applies to work inside `apps/web`.

## Read This First

- Review the monorepo before editing code, even for web-only tasks.
- This is a dual-language project: TypeScript in `apps/web` and Python in `apps/api`.
- Do not assume a frontend change is isolated until you have checked the root scripts, shared docs, and API contract.
- Read the relevant repo-level docs in `README.md`, `docs/contributing.md`, and `docs/architecture.md` before making workflow or architecture changes.

## Environment

- Use the repository devcontainer workflow as the default development environment.
- The repository is mounted at `/workspace` inside the devcontainer.
- Work from `/workspace/apps/web` when running app-local commands.
- Dependencies are installed during the devcontainer `postCreateCommand` (`python3 ./scripts/bootstrap.py`), which runs `pnpm bootstrap`.
- Prefer the containerized workflow instead of setting up a separate host-machine Node environment.

The default local stack includes:

- `web` on port `3000`
- `api` on port `8000`
- `postgres` on port `5432`
- `mongodb` on port `27017`
- `redis` on port `6379`
- `kafka` on port `9092`

The devcontainer Compose stack already starts `web` and `api`, so root scripts such as `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev` are for manual restart, debugging, or validation rather than first-run setup.

## Workspace Context

- This package is the ClubCRM Next.js frontend.
- The backend lives in `apps/api` and is a FastAPI service.
- The repo is a `pnpm` workspace with apps under `apps/*`.
- Root scripts are the source of truth for shared checks and common workflows across both stacks.
- The web package currently uses the App Router under `src/app`.

Important files:

- `package.json`
- `pyproject.toml`
- `apps/web/package.json`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/api/src/main.py`
- `apps/api/src/presentation/http/routes/health.py`
- `apps/web/README.md`
- `apps/api/README.md`
- `docs/contributing.md`
- `docs/architecture.md`

## Commands

From the repository root:

- `pnpm bootstrap` installs Node dependencies and provisions the API virtualenv/tooling
- `pnpm dev:web` restarts or runs the web app on `0.0.0.0`
- `pnpm dev:api` restarts or runs the FastAPI app from the Python virtualenv
- `pnpm dev` restarts or runs both app entrypoints together
- `pnpm build:web` runs the production web build
- `pnpm lint:web` runs the web ESLint checks
- `pnpm lint` runs the repo lint pipeline across both stacks
- `pnpm lint:api` runs Ruff against the backend
- `pnpm check:api` bytecode-compiles `apps/api/src` for a quick sanity check
- `pnpm verify` runs the repo verification pipeline

From `apps/web`:

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`

Prefer root-level scripts when the task affects shared workflow, CI parity, or multiple apps.
Treat the root scripts as the CI-facing contract unless there is a strong reason to use something narrower.

## Implementation Notes

- Keep changes aligned with existing Next.js App Router patterns in `src/app`.
- Check whether the change depends on backend routes, payloads, or environment variables before editing.
- Preserve TypeScript, ESLint, and Prettier compatibility.
- Respect the backend Python toolchain: Ruff, the in-repo `apps/api/.venv`, and the shell scripts in `scripts/` are part of the standard workflow.
- Preserve Python-side expectations when the web app reads API responses.
- Do not "fix" backend, infra, port, or container assumptions from the web side without checking the repo workflow first.
- Avoid editing generated or environment-specific artifacts such as `apps/api/.venv` unless the task explicitly requires it.
- Favor small, focused changes over broad refactors.
- Update repo docs, not just web docs, when behavior, setup, ports, API assumptions, or team workflow changes.

Current app behavior to keep in mind:

- `src/app/page.tsx` is currently a server-rendered health-check page.
- It probes the API using `API_BASE_URL`, then `http://api:8000`, then `http://localhost:8000`.
- The expected backend response comes from `apps/api/src/presentation/http/routes/health.py` and returns `{"status": "ok"}`.
- The page exports `dynamic = "force-dynamic"` and uses `fetch(..., { cache: "no-store" })`.

Do not remove or change this behavior casually unless the task explicitly calls for it.

## Quality Bar

Before finishing substantial web changes, run the most relevant checks:

- `pnpm lint:web` for frontend linting
- `pnpm build:web` when routing, rendering, config, or build behavior changes
- `pnpm verify` when the change affects shared tooling or cross-app behavior

If you cannot run a recommended check, say so clearly in your handoff.

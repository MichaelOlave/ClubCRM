# ClubCRM Agent Guide

This file applies to the entire repository unless a deeper `AGENTS.md` overrides it.

## Read This First

- Review `README.md`, `docs/contributing.md`, and `docs/architecture.md` before making workflow or architecture changes.
- Check for a closer `AGENTS.md` before editing inside an app. `apps/web/AGENTS.md` adds web-specific guidance.
- This is a dual-language monorepo: TypeScript and Next.js in `apps/web`, Python and FastAPI in `apps/api`.
- Do not assume a change is isolated to one app until you have checked the shared scripts, docs, and API contract.
- Prefer small, focused changes over broad refactors. Separate cleanup from behavior changes when practical.

## Environment

- The repository devcontainer is the default development environment.
- Before opening the devcontainer, create `.env` from `.env.example` at the repo root.
- The repository is mounted at `/workspace` inside the devcontainer.
- Dependencies are bootstrapped by `pnpm bootstrap`, which installs Node dependencies and provisions the API tooling.
- The Compose-backed local stack already starts `web`, `api`, `postgres`, `mongodb`, `redis`, and `kafka`.
- Treat `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev` as manual restart or debugging entrypoints, not the normal first-run workflow.

## Workspace Context

- `apps/web` contains the Next.js frontend.
- `apps/api` contains the FastAPI backend.
- `docs/` contains contributor, architecture, schema, and decision records.
- `infra/` contains Docker Compose configuration for the local stack.
- `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- The backend is intended to grow as a modular monolith with clean architecture style. Use `docs/architecture.md` as the source of truth for structural decisions.

Current implementation is still early-stage:

- `apps/web` currently centers on a health-check page.
- `apps/api` currently exposes `GET /health`.

Do not casually rewrite repo structure, ports, service assumptions, or the health-check flow unless the task explicitly calls for it.

## Commands

Run shared commands from the repository root unless there is a strong reason to scope them more narrowly.

- `pnpm bootstrap` installs workspace dependencies and API tooling.
- `pnpm dev:web` restarts or runs the web app.
- `pnpm dev:api` restarts or runs the API.
- `pnpm dev` runs both app entrypoints together.
- `pnpm build` runs the repo build pipeline.
- `pnpm build:web` runs the production web build.
- `pnpm format` runs formatting across the repo.
- `pnpm format:check` checks formatting across the repo.
- `pnpm lint:web` runs frontend ESLint checks.
- `pnpm check:api` runs the backend validation step.
- `pnpm lint` runs the shared lint pipeline.
- `pnpm verify` runs the CI-facing verification pipeline.
- `apps/api/.venv/bin/pre-commit run --all-files` runs all configured Git hooks manually.

Prefer root scripts for shared workflow, CI parity, and cross-app changes.

## Implementation Notes

- Keep TypeScript changes compatible with Prettier and ESLint.
- Keep Python changes compatible with Ruff and the settings in `pyproject.toml`.
- Use `PascalCase` for React components, types, and classes.
- Use `camelCase` for TypeScript functions, variables, props, and non-constant values.
- Use `snake_case` for Python functions, variables, and modules.
- Use `PascalCase` for Python classes.
- Write comments only when they explain intent, tradeoffs, or non-obvious behavior.
- Do not leave dead code, commented-out code, or stale TODOs behind.
- Avoid editing generated or environment-specific artifacts such as `apps/api/.venv` unless the task explicitly requires it.
- Update documentation when your change affects setup, workflow, architecture, ports, or behavior teammates rely on.

## Commit Hygiene

- When commits are generated automatically, use detailed commit messages that explain the actual change.
- Group automated commits by similar concern or file area instead of mixing unrelated work into one commit.
- Keep refactors, behavior changes, and documentation updates in separate commits when practical.

## Git Workflow

- Use one branch per logical change.
- Open one focused pull request per branch.
- Create a new branch for each feature, bug fix, non-trivial refactor, docs or workflow update, or cross-app API contract change.
- Keep unrelated work off the same branch.
- A branch may touch both `apps/web` and `apps/api` when the change is still one coherent feature or contract update.
- Isolate setup, ports, service assumptions, repo structure, and health-check flow changes in their own branch and update docs in the same pull request.
- Treat commits as checkpoints inside the branch. Prefer a few small, descriptive commits over one large mixed-purpose commit.
- Separate refactors from behavior changes when practical.
- Before opening a pull request, run the narrowest relevant root-level checks for the area you changed and include a short verification summary.

## Quality Bar

Before finishing substantial work, run the most relevant checks for the area you changed.

- Use `pnpm lint:web` for frontend-only changes.
- Use `pnpm check:api` for backend-only changes.
- Use `pnpm lint` for shared or cross-app changes.
- Use `pnpm verify` when behavior, shared tooling, or build output changes.

If you cannot run a recommended check, say so clearly in your handoff.

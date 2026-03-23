# Contributing to ClubCRM

This repository contains two application stacks:

- `apps/web` for the Next.js and TypeScript frontend
- `apps/api` for the FastAPI and Python backend

The goal of this guide is to keep contributions consistent across both sides of the codebase.

## Getting Started

The repository devcontainer is the standard development environment for this project.

The Compose stack reads default values from `.env.example`. If you need local overrides, create the environment file from the repository root before opening the devcontainer:

```bash
cp .env.example .env
```

If `.env` is absent, the repository falls back to the checked-in example values. Then open the project in the devcontainer.

The devcontainer already automates the initial setup for contributors:

- it opens the repository at `/workspace`
- it generates `.devcontainer/docker-compose.ports.yml` with the first available host ports for the local stack
- it runs the devcontainer `postCreateCommand` (`python3 ./scripts/bootstrap.py`)
- that command runs `pnpm bootstrap`
- `pnpm bootstrap` installs Node and Python dependencies and installs `pre-commit` hooks when available
- Docker Compose also starts the supporting local services and app containers defined by the repo

The devcontainer persists the PNPM store, workspace `node_modules`, web `node_modules`, web `.next`,
and the API virtualenv in Docker volumes so dependency installs and hot-reload output stay off the
bind-mounted source tree.

If a default host port such as `3000` or `5432` is already occupied, the devcontainer remaps that service to the next available port and records the actual bindings in `.devcontainer/docker-compose.ports.yml`.

If you need to rerun setup manually from inside the devcontainer, use:

```bash
pnpm bootstrap
```

Prefer the root `pnpm` scripts over direct `.venv/bin/...` paths or shell wrappers. They resolve the correct Python launcher and virtualenv layout for the current OS.

## Development Workflow

The commands below are expected to be run from inside the devcontainer workspace.

In the standard devcontainer flow, the Compose stack already includes:

- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

Use the commands below when you need to restart a service manually from the workspace terminal, debug outside the default Compose-managed process, or verify behavior after changing the app code.

Run the web app:

```bash
pnpm dev:web
```

Run the API:

```bash
pnpm dev:api
```

Run both:

```bash
pnpm dev
```

## Git Workflow

Use Git with a simple rule: one logical change per branch, and one focused pull request for that branch.

- Create a new branch for each feature, bug fix, non-trivial refactor, docs or workflow update, or cross-app API contract change.
- Keep unrelated work off the same branch, even when the files live in the same app.
- A change may span both `apps/web` and `apps/api` when it is still one coherent feature or contract update.
- Treat setup, ports, service assumptions, repo structure, and health-check flow changes as higher-risk work. Isolate them in their own branch and update docs in the same pull request.

Commits are checkpoints within the branch, while the pull request is the reviewable unit that should represent one mergeable story.

- Prefer a few small, descriptive commits over one large mixed-purpose commit.
- Separate refactors from behavior changes when practical.
- Keep commit messages specific to the actual change.

## Formatting and Linting

ClubCRM uses language-specific tools with a shared automation workflow:

- TypeScript and frontend assets: `Prettier` for formatting
- TypeScript and Next.js rules: `ESLint`
- Python: `Ruff` for linting and formatting
- Cross-language automation: `pre-commit`

### Automatic Checks

This repository already has several automation layers:

- the devcontainer runs post-create setup automatically
- `pre-commit` runs repository checks automatically on commit
- GitHub Actions runs the CI workflow automatically on pushes to `main` and on pull requests

After setup, Git hooks should run automatically on commit through `pre-commit`.

To run all hooks manually across the repository:

```bash
pnpm precommit:all
```

### Manual Checks

Run web linting:

```bash
pnpm lint:web
```

Run API validation:

```bash
pnpm check:api
```

Run the repository lint pipeline:

```bash
pnpm lint
```

Run the full CI-equivalent verification pipeline:

```bash
pnpm verify
```

## Code Standards

### General

- Prefer small, focused changes over large mixed-purpose pull requests.
- Keep functions and modules single-purpose when practical.
- Write comments only when they explain intent, tradeoffs, or non-obvious behavior.
- Do not leave dead code, commented-out code, or stale TODOs behind.

### TypeScript Standards

- Let `Prettier` own formatting decisions.
- Let `ESLint` enforce correctness and framework rules.
- Use `PascalCase` for React components, types, and classes.
- Use `camelCase` for functions, variables, props, and non-constant values.
- Keep framework code aligned with existing Next.js conventions in `apps/web`.

### Python Standards

- Let `Ruff` own both formatting and linting.
- Follow the current Ruff settings in [`pyproject.toml`](/Users/michaelolave/Projects/active/ClubCRM/pyproject.toml).
- Use `snake_case` for functions, variables, and modules.
- Use `PascalCase` for classes.
- Prefer explicit, readable imports and straightforward control flow.

## Pull Requests

Before opening a pull request:

- make sure formatting and linting pass
- run the narrowest relevant checks from the repository root for the area you changed
- run `pnpm verify` for CI-equivalent checks when your change affects app behavior, shared tooling, or build output
- verify the changed application still runs locally
- keep the PR focused on one logical change
- include context on what changed and how it was verified

When possible, separate refactors from behavior changes so reviews stay easy to follow.

## Documentation

Update documentation when your change affects:

- setup steps
- developer workflow
- architecture or domain decisions
- public behavior that teammates need to know about

Relevant project docs live in [`docs/`](/Users/michaelolave/Projects/active/ClubCRM/docs).

# Current Project Structure Analysis

## Purpose

This document reviews the current structure of ClubCRM as it exists today, not just the intended future architecture. It explains the major structural decisions that are already visible in the repository, why they are reasonable, what they cost, and where they are likely to help or hurt as the project grows.

The analysis is based on the current repository layout, source files, scripts, devcontainer setup, and the project documentation in `README.md`, `docs/contributing.md`, `docs/architecture.md`, `docs/decisions.md`, `apps/web/README.md`, and `apps/api/README.md`.

## Executive Summary

ClubCRM is currently a devcontainer-first monorepo with two application surfaces:

- `apps/web` for a Next.js frontend
- `apps/api` for a FastAPI backend

Around those two apps, the repository already includes a larger platform shape:

- shared root scripts for setup, linting, building, and verification
- a Docker Compose local stack
- a devcontainer workflow
- planned use of PostgreSQL, MongoDB, Redis, and Kafka
- central documentation for architecture, schema, decisions, and execution planning

The strongest quality of the current structure is intentionality. The team has made several good decisions early:

- one frontend and one backend instead of microservices
- a clear repo layout
- a single standard development environment
- explicit documentation of database responsibilities

The main downside is that the operational and architectural surface area is currently much larger than the implemented backend feature surface area. The frontend already ships a small but coherent admin and public MVP, but only the diagnostics route currently talks to the API while the surrounding platform is already set up for a much larger system.

That is not necessarily wrong. For an early-stage team project, especially one meant to demonstrate several databases and architectural thinking, it can be a smart choice. But it creates an important tradeoff: the project must keep turning that platform complexity into real features, or else the structure will start to feel heavier than the product.

## What Exists Today

### Repository Shape

The current repository is organized like this:

```text
/apps
  /api
  /web
/.devcontainer
/docs
  /proposals
/infra
/scripts
README.md
package.json
pnpm-workspace.yaml
pyproject.toml
```

This is a fairly standard modern monorepo shape, with clear separation between:

- application code
- environment and infrastructure setup
- workflow automation
- project documentation

### Current Runtime Behavior

Although the project is architected for much more, the implemented runtime behavior is still intentionally uneven:

- `/` redirects to `/dashboard`
- the frontend renders admin pages for dashboard, clubs, members, and diagnostics
- the frontend renders public pages for login and club join-form previews
- most frontend data currently comes from feature-owned server view-model modules
- the backend exposes only `GET /health`
- `/system/health` attempts to reach the backend using configured fallback base URLs

So the repo is currently best understood as:

- a strong platform scaffold
- a UI-first frontend MVP
- one small but real cross-app vertical slice

That framing matters, because many of the pros and cons below come from the difference between current implementation and intended future state.

## Decision 1: Use a Monorepo

### What the decision is

ClubCRM keeps both applications in one repository:

- `apps/web`
- `apps/api`

The workspace is managed by `pnpm`, and the root scripts define the main developer workflow.

### Why this decision makes sense

For a project with a tightly coupled frontend and backend, a monorepo is a practical default. It makes it easier to:

- change frontend and backend together
- standardize setup and verification
- keep documentation close to code
- share future packages such as types, schema helpers, API clients, or design tokens

The inclusion of `packages/*` in `pnpm-workspace.yaml` also shows the repo is prepared for shared packages later, even though none exist yet.

### Pros

- Cross-app changes are easier to coordinate than in separate repositories.
- One root `README.md` can describe the whole system.
- One verification pipeline can cover both apps.
- Shared tooling decisions are easier to enforce.
- The structure leaves room for future shared packages without reworking the workspace later.

### Cons

- The repo currently has more platform structure than feature code.
- New contributors must understand both JavaScript and Python tooling even if they only want to touch one side.
- A monorepo can encourage shared coupling if boundaries are not kept intentionally.

### Net assessment

This is a good decision for the current project scope. The main risk is not the monorepo itself. The real risk is allowing the monorepo to grow in coordination complexity before enough shared code or shared workflows exist to justify it.

## Decision 2: Keep One Frontend and One Backend Instead of Microservices

### What the decision is

The documented architecture explicitly chooses a modular monolith for the MVP. The project aims for:

- one Next.js frontend
- one FastAPI backend
- supporting infrastructure around that backend

### Why this decision makes sense

This is one of the strongest decisions in the repo.

The current project is still early-stage. The frontend already has a route-grouped MVP, but the backend still exposes only a health slice. Splitting into services now would create operational complexity that the product does not need:

- more deployment boundaries
- more communication patterns
- more duplicated configuration
- more debugging overhead

For the current scale, a modular monolith keeps the architecture understandable and keeps the team focused on shipping actual features.

### Pros

- Much lower complexity than microservices.
- Easier local development.
- Simpler debugging.
- Clearer ownership of business flows.
- Better fit for an MVP and for a project with limited implementation breadth today.

### Cons

- If internal module boundaries are not enforced, a monolith can become a big shared dependency graph.
- It may be tempting to put everything in framework-level code instead of preserving clean layers.
- Future extraction of services would take deliberate work if the system outgrows the monolith.

### Net assessment

This is the right architectural choice for the current state of the project. The important follow-through is to keep the backend modular internally so the monolith stays disciplined instead of becoming a tightly tangled app.

## Decision 3: Use a Devcontainer-First Workflow

### What the decision is

The project treats the repository devcontainer as the default developer experience. The devcontainer:

- mounts the repo at `/workspace`
- starts the full Compose stack
- runs post-create bootstrap
- forwards ports for the web app, API, and data services

### Why this decision makes sense

This repository spans:

- Node and pnpm
- Python and a virtual environment
- Docker Compose
- several backing services

A standardized containerized environment removes many setup differences between machines and teammates. For a cross-language project, that is a real benefit.

### Pros

- High environment consistency across contributors.
- Easier onboarding when the devcontainer works well.
- Lower “works on my machine” risk.
- Useful for demo-heavy projects where the local stack must be predictable.

### Cons

- The default workflow assumes Docker and devcontainer support, which is a real operational cost.
- Startup is heavier than necessary for the currently implemented feature set.
- Contributors must understand containerized development even for small code changes.
- The web app uses polling-based file watching in containers, which is practical but resource-heavier.

### Net assessment

This is a good decision for consistency, but it front-loads operational complexity. It pays off best when the team actually uses the full stack regularly. If development stays mostly in simple app slices for too long, the workflow may feel heavier than the codebase needs.

## Decision 4: Start the Full Local Stack Early

### What the decision is

The default local environment includes:

- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

### Why this decision makes sense

The project is explicitly designed to demonstrate multiple persistence and infrastructure technologies. Starting them all locally gives the team one consistent integration environment and makes demos easier once real features exist.

### Pros

- Matches the intended system architecture.
- Makes integration testing and demos more straightforward.
- Encourages the team to think about full-system behavior early.

### Cons

- The stack is much larger than what the current code actually uses.
- More services means more startup cost and more things that can fail.
- Kafka is documented as non-critical but still present in the standard local stack, so the team pays operational cost before receiving much functional value.
- The API service currently depends on all backing services at the Compose level, even though its implemented behavior does not yet use them.

### Net assessment

This is defensible for a class or demonstration-oriented project, but it is one of the clearest examples of the repo being more mature operationally than functionally. The stack is forward-looking, but today it is heavier than necessary.

## Decision 5: Centralize Workflow in Root Scripts

### What the decision is

The root `package.json` acts as the shared workflow contract. It defines:

- bootstrap
- build
- lint
- verify
- app restart and debug commands

The `scripts/` directory wraps environment loading and toolchain details.

### Why this decision makes sense

A repo with multiple apps benefits from one standard set of entrypoints. It reduces the chance that one teammate uses app-local commands while another uses slightly different commands with different behavior.

The scripts also hide implementation details such as:

- loading `.env`
- activating the Python virtual environment
- invoking the correct web build or dev command

### Pros

- Strong CI parity.
- Easier onboarding because contributors can learn a few root commands.
- The helper scripts provide one place to encode environment assumptions.
- Good separation between developer-facing commands and raw tool invocations.

### Cons

- Some commands are slightly redundant.
- `pnpm dev` relies on a small custom Node launcher instead of an off-the-shelf process manager, which keeps the setup simple but still leaves some orchestration logic to maintain in-repo.
- Repo-wide automation currently depends partly on the API virtualenv layout, especially for `pre-commit`.

### Net assessment

This is a solid decision. The only real weakness is that some of the workflow is more pragmatic than elegant, but for the current size of the project that is acceptable.

## Decision 6: Keep Documentation Centralized in `docs/`

### What the decision is

The repository uses a central `docs/` folder for:

- architecture
- contributing workflow
- schema guidance
- architecture decisions
- team execution planning
- project proposals

The naming pattern is kebab-case, for example:

- `architecture.md`
- `team-execution-plan.md`
- `final-project-proposal.md`

### Why this decision makes sense

Centralized docs are easier to discover in a small repo and help keep architectural intent visible. This is especially helpful in an early-stage codebase where many structural decisions are still ahead of the implementation.

### Pros

- Easy to find.
- Consistent naming.
- Good for onboarding.
- Helps the repo feel intentional and documented.

### Cons

- Some docs describe future architecture more than current implementation.
- There is no obvious “implemented vs planned” status layer, so readers must infer what is real today.
- `docs/decisions.md` is a single aggregated ADR file, which works now but may get harder to maintain if many more decisions accumulate.

### Net assessment

This is the right documentation strategy for the current project size. The main opportunity is to keep future-state docs clearly distinguishable from currently implemented behavior.

## Decision 7: Use Next.js for the Frontend

### What the decision is

The web app uses:

- Next.js `16.2.1`
- React `19.2.4`
- App Router
- Tailwind CSS v4

The current app surface is intentionally small, but it is no longer centered on a single page. The web app now has route-grouped admin and public flows backed by feature-owned view models, with diagnostics kept on a dedicated system-health route.

### Why this decision makes sense

For an admin-style web product, Next.js is a reasonable choice:

- file-based routing
- strong React ecosystem
- good server rendering support
- straightforward deployment options later

The App Router is also the right default for a new Next.js project rather than something legacy.

### Pros

- Modern and well-supported frontend stack.
- Good fit for dashboard, CRUD, and admin UI work.
- Server-rendered pages make the current UI-first MVP and diagnostics flow straightforward.
- The feature-first layout already gives the team a reasonable growth path.

### Cons

- Most frontend data is still local to the web app, so the backend contract lags behind the UI surface.
- `next.config.ts` is effectively empty, so the project has little encoded frontend policy yet.
- The app is using very new framework versions, which is fine, but it increases the need to stay aligned with current framework documentation.

### Net assessment

This is a strong default choice. The bigger question is not the framework. It is whether the team will keep the current feature-first shape aligned with a real backend contract as more routes graduate from UI-first prototypes into end-to-end features.

## Decision 8: Move the Health Check into a Dedicated Diagnostics Route

### What the decision is

The health check now lives on `/system/health`, while the homepage redirects to `/dashboard`. The diagnostics route:

- runs on the server
- exports `dynamic = "force-dynamic"`
- performs `fetch(..., { cache: "no-store" })`
- checks the API health endpoint using multiple fallback base URLs

### Why this decision makes sense

For the current state of the system, this is clever and practical. It preserves the original connectivity check while freeing the homepage to become product-facing UI. It proves that:

- the web runtime is alive
- the API runtime is alive
- the web app can reach the API from its actual server environment

This is more useful than a purely client-side test because it validates server-to-server connectivity in the environment the app actually runs in.

### Pros

- Excellent early-stage integration check.
- Keeps infrastructure-specific behavior out of the main product entry point.
- Avoids CORS complexity.
- Surfaces real connectivity issues between containers and local host fallbacks.
- Gives the team a visible status page from day one.

### Cons

- The page is tightly coupled to current infrastructure assumptions such as `api:8000`.
- `force-dynamic` and `no-store` are correct for a health page but would be a poor default for normal product pages.
- The fallback behavior only continues on network failure, not on a non-OK HTTP response.
- The route is still the only live frontend-to-backend integration path, so the product shell is ahead of the API contract.

### Net assessment

This is a very good decision for the current stage. The move into a dedicated diagnostics surface already happened, and it was the right call. The next challenge is not placement anymore; it is growing more real backend-backed routes around it.

## Decision 9: Use Route Groups and Feature Folders to Grow Beyond the Initial Scaffold

### What the decision is

The meaningful frontend source now spans route groups, shared primitives, and feature folders such as:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/clubs/...`
- `src/app/(app)/members/...`
- `src/app/(app)/system/health/page.tsx`
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/join/[clubId]/page.tsx`
- `src/components/layout/*`
- `src/components/ui/*`
- `src/features/*`

The app already uses a lightweight feature-first pattern with feature-owned `server`, `components`, and `types` modules.

### Why this decision makes sense

At the current size of the app, this is a good middle ground. The team moved past a single-file scaffold without jumping all the way to a heavy design system or client-state architecture.

### Pros

- Clear separation between admin and public route groups.
- Shared layout and UI primitives already exist for reuse.
- Feature folders communicate where future business logic should live.

### Cons

- The current pattern is still UI-first and does not yet prove long-term boundaries against real API integrations.
- Some feature folders currently serve mock or view-model data rather than backend-backed behavior.
- Without discipline, the shared UI layer and feature `server` modules could become a dumping ground as more slices land.

### Net assessment

This is a healthy next step beyond the initial scaffold. It becomes a liability only if the backend and domain contracts fail to catch up to the structure the frontend now advertises.

## Decision 10: Use Tailwind and Font Variables for the Frontend Styling Baseline

### What the decision is

The frontend styling uses:

- Tailwind CSS v4
- global CSS variables
- Google font loading through Next.js

### Why this decision makes sense

This gives the frontend a modern baseline with minimal overhead. Tailwind is a practical choice for rapidly building admin interfaces, especially when the team may need to move quickly.

### Pros

- Fast styling iteration.
- Low initial ceremony.
- Easy to build polished admin screens with utility classes.
- Good alignment with modern Next.js usage.

### Cons

- The styling system is only partially normalized into tokens.
- The loaded Geist fonts are undercut by the global `Arial, Helvetica, sans-serif` body font declaration.
- Heavy inline utility usage can become noisy if the app grows without introducing reusable components.

### Net assessment

The styling baseline is good, but it is still at the “starter system” stage rather than a mature design system stage.

## Decision 11: Use FastAPI for the Backend

### What the decision is

The API uses FastAPI with a very small current implementation:

- `src/main.py`
- `src/config.py`
- `src/presentation/http/routes/health.py`

### Why this decision makes sense

FastAPI is a strong fit for the kind of backend the docs describe:

- CRUD-heavy workflows
- schema validation
- rapid iteration
- clean HTTP route definition

It is also a sensible Python choice for a team project where readability and velocity matter.

### Pros

- Productive framework for API work.
- Good balance of simplicity and structure.
- Strong ecosystem for request validation and API development.
- Matches the documented clean separation between presentation and future application logic.

### Cons

- The actual implementation is still much smaller than the target architecture described in the docs.
- The current code does not yet demonstrate the layered design the project intends to adopt.
- Without careful growth, FastAPI route files can become the place where too much logic accumulates.

### Net assessment

This is a strong backend framework choice. The real challenge is not the framework itself but following through on the intended internal architecture as more features are added.

## Decision 12: Start the Backend with a Minimal Layered Scaffold

### What the decision is

The backend currently has a small but intentional layout:

```text
apps/api/src/
  main.py
  config.py
  presentation/
    http/
      routes/
        health.py
```

This already signals separation between:

- app startup
- configuration
- HTTP presentation

### Why this decision makes sense

Even though the implementation is minimal, this is better than putting everything in a single file. It gives the project a path toward the documented clean architecture without forcing the full structure too early.

### Pros

- Clear intent.
- Easy to grow into.
- Keeps HTTP concerns separate from app bootstrap.
- Makes the next structural steps predictable.

### Cons

- The repo documentation describes a much richer backend layering model than what exists today.
- There is still a substantial gap between intended architecture and implemented module boundaries.
- Because there is no domain or application layer yet, the current structure is mostly a promise rather than an enforced pattern.

### Net assessment

This is a good scaffold. It becomes valuable only if future backend work actually continues in the same direction instead of bypassing it.

## Decision 13: Centralize Runtime Configuration in `config.py`

### What the decision is

The backend reads environment-driven settings from `src/config.py` using a dataclass plus `lru_cache`.

The settings include:

- API host and port
- API base URL
- PostgreSQL URL
- MongoDB URL
- Redis URL
- Kafka bootstrap servers

### Why this decision makes sense

A single settings module is a clean way to keep environment concerns out of route handlers and startup logic.

### Pros

- Configuration is centralized.
- The settings object is easy to read.
- Cached settings avoid repeated environment parsing.
- The presence of connection settings makes the intended infrastructure explicit.

### Cons

- Validation is lightweight compared with a stronger typed settings solution.
- Some settings are present before the app actually uses them, which increases the sense of “planned platform” over “current implementation.”
- The API currently imports many future-facing connection values without proving them through application behavior yet.

### Net assessment

This is a good simple configuration approach for the current codebase. It may eventually benefit from stronger validation once the number of settings and environments grows.

## Decision 14: Keep the Backend Feature Surface Minimal with `GET /health`

### What the decision is

The only implemented route is:

- `GET /health` returning `{"status": "ok"}`

### Why this decision makes sense

This is the smallest useful backend slice because it:

- proves the API can boot
- gives the frontend something real to call
- creates a baseline observability signal

### Pros

- Extremely low complexity.
- Useful for local environment validation.
- Good foundation for adding more routes.

### Cons

- It does not yet exercise any of the databases or infrastructure the repo provisions.
- It can make the project feel less complete than the surrounding docs and Compose stack suggest.
- It reveals almost nothing yet about how domain, application, or infrastructure layers will actually work.

### Net assessment

This is the right first route. It is simply no longer enough to represent the system once the repo has grown this much around it.

## Decision 15: Plan Clean Architecture and Feature Modules in the Backend

### What the decision is

The docs describe a target backend direction with:

- domain
- application
- infrastructure
- presentation
- business feature modules such as clubs, members, events, forms, and auth

### Why this decision makes sense

This is a thoughtful choice for the kind of system ClubCRM wants to become. It preserves:

- separation of business rules from frameworks
- clearer testability
- better long-term maintainability
- room for infrastructure adapters without polluting core logic

### Pros

- Encourages strong boundaries.
- Supports maintainable growth.
- Helps avoid framework-driven coupling.
- Fits the modular monolith strategy well.

### Cons

- This structure is not yet implemented, so there is a risk of drift between docs and code.
- If introduced too mechanically, it could become over-abstracted before the app has enough logic to justify every layer.
- Teams sometimes over-apply clean architecture patterns and slow down delivery.

### Net assessment

This is a good target architecture, but it should be introduced incrementally as real features appear. The current docs are directionally strong; the code simply has not grown into them yet.

## Decision 16: Pre-Assign Database Responsibilities

### What the decision is

The docs clearly define intended responsibilities for:

- PostgreSQL as the system of record
- MongoDB for flexible form submissions
- Redis for cache and short-lived data
- Kafka for event-driven and observable async workflows

### Why this decision makes sense

The project wants to use multiple data technologies without turning that into chaos. Explicitly assigning each technology a job reduces accidental misuse and supports clearer demos.

### Pros

- Strong architectural clarity.
- Makes it easier to explain the system to teammates and reviewers.
- Reduces the risk of “we have this database, so let’s use it for everything.”
- Creates a plausible data story for the target product.

### Cons

- The data architecture is much more advanced than the current implementation.
- Multiple databases increase the burden of consistency, testing, and local operations.
- If the application never grows enough to need this separation, the design may feel more academic than practical.

### Net assessment

The decision is coherent and well-documented. Its success depends on whether the team turns each database into a real, necessary part of the product rather than a checkbox.

## Decision 17: Use Root-Level Verification Across Both Stacks

### What the decision is

The project uses:

- Prettier for formatting
- ESLint for the web app
- Ruff for the API
- `pre-commit` for repository automation
- `pnpm verify` as the CI-facing local verification command

### Why this decision makes sense

Cross-language repos need one common verification entrypoint, even if the underlying tools differ. The current setup achieves that reasonably well.

### Pros

- Clear local-to-CI contract.
- Makes quality expectations explicit.
- Keeps app-specific tools behind a shared repo-level command surface.

### Cons

- Some verification steps overlap conceptually.
- The automation chain depends partly on the API virtualenv layout.
- There are still more workflow layers than the current feature set strictly requires.

### Net assessment

This is a healthy quality setup. It is slightly heavier than necessary today, but it positions the project well for more real code.

## Biggest Structural Strengths

- The repo has a clear architectural point of view.
- The monorepo boundary is sensible.
- The modular monolith choice is appropriate.
- The development environment is standardized.
- Documentation is unusually strong for an early-stage project.
- The diagnostics slice is still small but useful because it validates real cross-app connectivity.

## Biggest Structural Weaknesses

- The backend and data layers are still much smaller than the frontend shell and surrounding platform.
- The local stack is heavy relative to present functionality.
- Some structure is still scaffold-like rather than intentionally matured.
- The project has not yet proven that each database and service meaningfully earns its place.

## Overall Judgment

The current structure of ClubCRM is thoughtful, coherent, and stronger than a typical early scaffold. The team has made several good decisions early, especially around:

- keeping the MVP as a modular monolith
- standardizing local development
- documenting database and architectural intent
- using root-level automation

The main tradeoff is clear: the repository is currently optimized for the system ClubCRM intends to become, not just the app ClubCRM currently is.

That is a reasonable strategy if the next phase of work converts the platform into real feature slices. If that happens, the current structure will look like strong foresight. If it does not, the repo will start to feel overbuilt for its behavior.

Right now, the structure is good. The next challenge is not redesign. The next challenge is alignment: grow the implementation fast enough, and cleanly enough, that it catches up to the architecture the repository already promises.

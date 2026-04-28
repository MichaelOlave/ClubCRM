# Current Project Structure Analysis

## Purpose

This document reviews ClubCRM as it exists in the repository today. It focuses on the implemented
shape of the codebase, tooling, and runtime behavior, then explains which structural decisions are
already paying off and which ones are still ahead of the product.

This snapshot reflects the repository state in April 2026. It is a point-in-time analysis, not the
ongoing source of truth. It is based on the live tree plus the
key workflow and architecture sources in `README.md`, `docs/contributing.md`,
`docs/architecture.md`, `docs/README.md`, `apps/web/README.md`, `apps/api/README.md`,
`.github/workflows/`, `infra/`, `scripts/`, `apps/web/src`, and `apps/api/src`.

## Executive Summary

ClubCRM is a devcontainer-first monorepo with:

- a Next.js web app in `apps/web`
- a FastAPI backend in `apps/api`
- root-level workflow scripts for setup, build, lint, and verification
- a Compose-managed local stack for PostgreSQL, MongoDB, Redis, and Kafka
- CI checks and a production deployment path for SSH-managed Docker Compose

The repo is still structurally ahead of its runtime behavior, but the gap is narrower than it used
to be. The frontend remains a UI-first MVP, yet it now performs several live web-to-api
integrations: backend-owned auth, health diagnostics, club and member administration, membership
assignment, and activity reads for events and announcements. The backend, meanwhile, is no longer
just a single-route scaffold. It now has bootstrap, config, presentation, module, infrastructure,
and test layers that encode the intended modular-monolith direction in code.

The main strength of the repo is that its architecture is no longer only documented. It is starting
to be exercised through folder boundaries, port interfaces, adapter contracts, routes, and tests.
The main weakness is that some of this structure is still preparatory: some frontend composition is
still web-side, the dashboard module is useful but still shallow, and the multi-database footprint
is not yet exercised as deeply as the target architecture describes.

## What Exists Today

### Repository shape

```text
/
  .devcontainer/
  .github/workflows/
  apps/
    api/
    web/
  docs/
    analysis/
    assets/
    deployment/
    guides/
    plans/
    proposals/
  infra/
  scripts/
  README.md
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  pyproject.toml
  uv.lock
```

This is a mature monorepo shape for a project that still has a relatively small live feature
surface. The repo is not just application code. It also contains a defined local environment,
deployment path, CI pipeline, and internal documentation map.

### Current runtime behavior

Today the system behaves like this:

- `/` is a public landing page that checks backend auth state to tailor its primary actions
- the web app has admin routes for dashboard, profile, clubs, members, club-level join-request review, `/system/audit`, and `/system/health`
- the web app has public routes for `/login`, `/not-provisioned`, `/docs`, `/testing`, `/join/[clubId]`, and `/demo/failover`
- most frontend feature data still comes from server-side modules under
  `apps/web/src/features/*/server`
- the login, profile, health, audit, dashboard, club, member, membership, event, announcement, and join-request flows all perform real server-side API calls
- club detail pages read memberships, events, and announcements from the API, while page-level composition still stays web-side
- the API registers routers for `system`, `auth`, `announcements`, `clubs`, `events`, `forms`,
  `dashboard`, `members`, and `memberships`
- the API exposes live health, auth-session, audit-log, club, member, membership, event, announcement, dashboard-summary, dashboard Redis analytics, and forms join-request routes
- FastAPI's generated `/docs`, `/redoc`, and `/openapi.json` remain available by framework default
- the local stack still starts `web`, `api`, `postgres`, `mongodb`, `redis`, and `kafka` together

That makes the repo best understood as:

- a UI-first frontend MVP
- a modular backend with a growing but still incomplete HTTP surface
- an operational platform that is already prepared for deeper feature slices

## Decision 1: Use a Monorepo With Root-Level Workflow Contracts

ClubCRM keeps both applications in one repository and defines the main contributor workflow from
the root through `package.json`, `pnpm-workspace.yaml`, `pyproject.toml`, and the helper scripts in
`scripts/`.

This is still a strong decision. The current codebase spans TypeScript, Python, Docker Compose, and
multi-database configuration. A monorepo makes it easier to keep those parts aligned.

### Why it works well now

- Cross-app changes can stay in one review unit.
- The root scripts provide a single contract for bootstrap, build, lint, check, and verify.
- The workspace is already prepared for future shared packages through `packages/*`, even though no
  shared package exists yet.
- Node workspace membership is defined in `pnpm-workspace.yaml`, while the Python backend is wired
  into the same root workflow through the shared bootstrap and verification scripts.

### Current costs

- The repo asks contributors to understand both Node and Python tooling, even for changes that
  touch only one side.
- The overall workflow surface is still larger than the live business behavior.
- Shared tooling discipline has to be maintained intentionally so the monorepo does not become a
  loose collection of side-by-side apps.

### Net assessment

The monorepo is still the right choice. The more important question now is not whether the repo
should be split. It is whether the implementation keeps growing in ways that justify the shared
workflow and shared operational surface the repo already carries.

## Decision 2: Standardize on a Devcontainer-First Development Environment

The devcontainer remains the default development path, and it is no longer a thin wrapper around
one app. It coordinates the full stack, generates port mappings, bootstraps dependencies, and
relies on Docker volumes to keep large dependency directories and generated output off the
bind-mounted source tree.

The relevant structure is visible in:

- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.devcontainer.yml`
- `.devcontainer/docker-compose.ports.yml`
- `.devcontainer/prepare-ports.mjs`
- `infra/docker-compose.yml`

### Why this decision makes sense

For this repo, environment standardization solves several real problems at once:

- Node and Python need to coexist.
- The backend expects multiple backing services.
- The web and API services need predictable connectivity.
- Team members benefit from one shared setup path.

### Current strengths

- Local onboarding is more reproducible than in a host-native setup.
- The stack starts with consistent service names and health checks.
- The repository scripts can assume the same baseline environment across contributors.
- The devcontainer persists the PNPM store, workspace `node_modules`, web `node_modules`, web
  `.next`, and the API virtualenv, which reduces repeated setup churn.

### Current costs

- The default development environment is still heavy for the amount of end-to-end product behavior
  currently implemented.
- Docker, Compose, and forwarded-port coordination are part of the baseline mental model even for
  simple changes.
- File watching remains polling-based for the web app in containers, which is practical but not
  lightweight.

### Net assessment

This remains a good team-level choice. The tradeoff is still operational heaviness, but the repo
has enough cross-language and multi-service behavior now that a standardized container workflow is
easier to justify than it was earlier.

## Decision 3: Start the Full Local Stack Early

The default local stack still includes:

- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

That full stack is declared in `infra/docker-compose.yml`, and the `web` and `api` services wait on
health-checked dependencies before they start.

### Why this decision makes sense

The project wants to demonstrate clear multi-database responsibilities and event-driven side
effects. Starting the whole stack gives the team one integration environment and avoids optional
service drift between contributors.

### What has improved since earlier iterations

The stack is still larger than the live user-facing behavior, but the codebase now actually
contains infrastructure clients, ports, adapters, and tests for those technologies. The extra
services are not just speculative anymore. They are structurally represented in the backend.

### Current costs

- The runtime product still does not expose the full set of HTTP features the folder structure
  implies, especially around richer dashboard and reporting flows.
- Some adapters are still lightweight or contract-oriented rather than complete production-style
  integrations.
- Kafka and the extra data stores still create more local operational weight than the current route
  surface strictly needs.

### Net assessment

This is still a forward-looking decision, but it is less speculative than before. The stack is now
structurally earned by the backend architecture, even if it is not yet fully earned by live product
flows.

## Decision 4: Carry a Larger Operational Footprint Than a Typical Early MVP

The repo now includes more than local development infrastructure. It also has:

- CI in `.github/workflows/ci.yml`
- SSH-based deployment automation in the `deploy-production` job inside `.github/workflows/ci.yml`
- a production Compose file in `infra/docker-compose.production.yml`
- a Caddy reverse proxy in `infra/Caddyfile`
- app-specific Dockerfiles in `apps/web/Dockerfile` and `apps/api/Dockerfile`

This is a meaningful change from a simpler early scaffold. ClubCRM now has a documented and
scripted deployment story, not just a local dev story.

### Why this is valuable

- The project can demonstrate not only code structure but also delivery structure.
- The SSH deployment workflow keeps build and restart steps explicit.
- Production routing is already separated so `/api/*` can proxy to the backend while the web app
  serves the rest of the product shell.

### Why it is still a tradeoff

- The deployment surface is more mature than the feature surface.
- The production stack still mainly serves a UI-first MVP plus a growing but incomplete admin API.
- Operational maturity can outpace product maturity if the team is not careful.

### Net assessment

This is a credible and useful deployment path, especially for a course or demo-driven project. It
does, however, reinforce the repo's main structural pattern: the platform is further along than the
product behavior.

## Decision 5: Keep Documentation Centralized and Layered by Topic

The repo still uses `docs/` well, but the structure is richer now:

- top-level guidance in `docs/README.md`, `docs/contributing.md`, `docs/architecture.md`,
  `docs/schema.md`, and `docs/decisions.md`
- implementation guidance in `docs/guides/`
- planning material in `docs/plans/`
- proposals in `docs/proposals/`
- deployment notes in `docs/deployment/`
- analysis documents in `docs/analysis/`

### Why this remains a strong decision

The repo now spans code, architecture, workflow, deployment, and course-deliverable context.
Centralized docs prevent that context from getting buried in app-local README files or PR history.

### Current strengths

- The docs map is easy to scan.
- The top-level guidance stays aligned with the repository workflow.
- The app READMEs in `apps/web` and `apps/api` now describe their internal structure more
  concretely than before.
- The distinction between architecture guidance and analysis documents is clearer than in a flatter
  docs layout.

### Current costs

- The repository still requires readers to distinguish between implemented now, scaffolded next, and
  target architecture across several docs.
- `docs/decisions.md` is still an aggregated file, which may become hard to maintain if many more
  decisions accumulate.
- Analysis documents like this one need regular refreshing because the repo is changing faster than
  before.

### Net assessment

The documentation strategy is still a major strength. The most important maintenance task is to
keep the current-state analysis honest whenever the code catches up to or diverges from the
architecture docs.

## Decision 6: Use a Feature-First Next.js Structure on the Web

The frontend now has a stable feature-first shape:

```text
apps/web/src
  app/
    (app)/
      dashboard/
      clubs/
        [clubId]/
          join-requests/
      members/
        [memberId]/
    system/
      audit/
      health/
    (public)/
      docs/
      login/
      not-provisioned/
      testing/
      join/[clubId]/
  components/
    layout/
    ui/
  features/
    auth/
    clubs/
    dashboard/
    forms/join-request/
    health/
    members/
    memberships/
  hooks/
  lib/
    api/
    env/
    utils/
  types/
```

This is a healthier structure than a single-page or route-only scaffold. It separates route
composition from feature code and keeps a small shared layer for layout, UI primitives, and
utilities.

### Why this is working

- The admin and public route groups are easy to understand.
- Feature folders give the web app a clear home for view models, types, and components.
- Shared primitives in `components/ui` and shell components in `components/layout` keep the feature
  folders from absorbing every reusable element.
- The import-direction rule in `apps/web/eslint.config.mjs` turns part of the structure into an
  enforced boundary rather than a suggestion.
- `apps/web/next.config.ts` now carries real deployment-oriented settings through standalone output
  and workspace-root file tracing.

### Current costs

- The pattern is mature enough to feel architectural, but much of the data it renders is still
  local to the web app.
- Shared folders could still become overly broad if the app grows without discipline.
- The shape looks more integrated than the actual backend contract currently is.

### Net assessment

This is the right frontend structure for the app's current size. It is organized enough to scale,
but not so abstract that it blocks UI work.

## Decision 7: Keep Web Composition Feature-First as Backend Coverage Expands

The frontend is still UI-first, but it is no longer simply waiting on the API. The server modules
under `apps/web/src/features/*/server` provide route-ready view models and call live backend
endpoints for auth, dashboard, audit, clubs, members, memberships, events, announcements, and
join-request workflows.

That remains one of the repo's defining characteristics.

### Why this decision made sense

- It let the team build a coherent product shell early.
- It gave routing, layout, and feature boundaries a real surface to grow around.
- It made it possible to demonstrate the intended user experience before the backend was
  feature-complete.

### Why it is now a clearer tradeoff

- Some page composition and demo-oriented surfaces still live primarily in the web app.
- The web app still advertises a broader product ambition than the API fully covers.
- Frontend types and UX flows can drift from the API if the backend later evolves differently.

### Net assessment

This is still a reasonable strategy, but it now needs contract discipline more than broad
restructuring. The frontend no longer needs a redesign. It needs the remaining local composition
and deeper reporting behavior to continue graduating into backend-backed slices.

## Decision 8: Preserve the Dedicated Diagnostics Route

The health check is no longer on the homepage. It lives on `/system/health`, while `/` now checks
the backend auth session before redirecting to `/dashboard`, `/not-provisioned`, or `/login`.

This is still one of the best concrete structural choices in the repo.

### Why it works

- It keeps product navigation separate from environment diagnostics.
- It validates real server-side connectivity from the web runtime to the API.
- It uses multiple fallback base URLs, which makes it resilient across container and host-local
  development contexts.
- It is a useful reference slice for how a server-rendered feature can talk to the backend.

### Current costs

- The fallback logic is still tied to current environment assumptions.
- The health feature is one of several live cross-app flows, but it still carries outsized
  architectural significance because it is the most explicit diagnostics reference slice.
- The dedicated diagnostics slice is now stable, which also makes the absence of other
  backend-backed slices in areas like forms and richer dashboards more visible.

### Net assessment

This remains a very good decision. The only thing it no longer proves is broader product
integration. It proves the plumbing, not the feature contract.

## Decision 9: Grow the Backend as a Modular Skeleton Before Filling in the HTTP Surface

The backend is no longer accurately described as a tiny `main.py` plus one route file. The current
structure is closer to:

```text
apps/api/src
  main.py
  bootstrap/
    app_factory.py
    dependencies.py
  config/
    settings.py
  presentation/http/
    router.py
    exception_handlers.py
  modules/
    system/
    dashboard/
    clubs/
    forms/
    announcements/
    auth/
    events/
    members/
    memberships/
  infrastructure/
    postgres/
    mongodb/
    redis/
    kafka/
```

There are also meaningful tests under `apps/api/tests/`.

### Why this is a strong structural step

- App bootstrap is separated from routing.
- Configuration is centralized in `config/settings.py`.
- Business modules now exist as actual packages, not just as future folder names in docs.
- The codebase includes real examples of domain entities and application logic in the `clubs` and
  `forms` modules.
- The test suite includes architectural boundary checks, not just behavior checks.

### Why this still has limits

- Some modules are still partial slices.
- Modules such as `dashboard` still provide a narrower surface than the final product ambition.
- The current structure now proves both architectural intent and a meaningful amount of product
  capability, but it still stops short of the full UI surface the frontend advertises.

### Net assessment

This is a meaningful improvement over the older scaffold. The backend has crossed an important
line: its intended architecture is now partly implemented in code, not just described in prose.

## Decision 10: Model Database Integration Through Capability-Based Ports

The backend is organized around capability-specific interfaces instead of one generic persistence
abstraction. The current code already distinguishes:

- `Repository` style ports for relational access
- `Store` style ports for document persistence
- `Cache` style ports for Redis-backed summaries
- `Publisher` style ports for Kafka-backed side effects

Those interfaces live in module-specific application layers, while concrete adapters live in
`src/infrastructure/*`. `bootstrap/dependencies.py` is the manual wiring layer.

### Why this is a strong choice

- It fits the modular monolith goal well.
- It keeps module responsibilities explicit.
- It avoids pretending that PostgreSQL, MongoDB, Redis, and Kafka have the same shape.
- It makes future tests and refactors more targeted.

### What is still not fully realized

- Some adapters are still mostly boundary anchors rather than full infrastructure integrations.
- PostgreSQL-backed repositories now power real club, member, membership, event, announcement,
  audit, auth, and dashboard routes.
- MongoDB and Redis now participate in live join-request, session, rate-limit, and dashboard-cache
  flows, while Kafka remains a scaffolded async boundary without broker-backed consumers.
- The API routes now inject and exercise several of these dependencies, but not yet the full set of
  planned multi-database responsibilities.

### Net assessment

This is one of the most mature design decisions in the codebase. It is also one of the clearest
examples of structure getting ahead of behavior. The abstraction strategy is good. The product just
needs more routes that actually use it.

## Decision 11: Back the Architecture With Tests, Not Just Folder Names

The API now includes unit tests that do more than assert return values. They check architectural
boundaries and adapter contracts.

Examples include:

- module boundary tests for `clubs` and `forms`
- route registration tests for `system`
- adapter contract tests for PostgreSQL, MongoDB, Redis, and Kafka

### Why this matters

A lot of early-stage projects describe good architecture but do not test it. ClubCRM has started to
turn some of its architectural rules into executable checks.

### Current strengths

- The tests confirm that application layers avoid framework and infrastructure imports.
- The tests verify that adapters satisfy their corresponding ports.
- The tests make the backend structure more intentional and less accidental.

### Current limits

- The tests are still mostly structural and unit-level.
- There are not yet end-to-end tests proving real database-backed or event-backed request flows.
- The web app does not yet have an equivalent visible testing story in the repository.

### Net assessment

This is a very healthy sign. The backend architecture is not just aspirational anymore. It is
beginning to be defended by tests.

## Decision 12: Keep the Live API Surface Smaller Than the Internal Backend Structure

`apps/api/src/presentation/http/router.py` now includes routers for:

- `system`
- `auth`
- `announcements`
- `clubs`
- `events`
- `forms`
- `dashboard`
- `members`
- `memberships`

Those routers no longer point to just one live endpoint. The backend now exposes:

- `GET /health` for diagnostics
- the backend-owned auth flow under `/auth`
- CRUD or read endpoints under `/clubs`, `/members`, `/memberships`, `/events`, and `/announcements`
- join-request submission, pending review, approve, and deny endpoints under `/forms`
- `GET /dashboard/summary`, `GET /dashboard/summary/{club_id}`, and
  `GET /dashboard/redis-analytics/{club_id}` for org, club, and cache analytics summaries

The important distinction now is not "one route versus many folders." It is "some real product
routes versus a still larger amount of prepared structure."

### Why this matters

The backend now has three different layers of maturity:

- the folder structure is fairly mature
- several application and infrastructure slices are implemented and routed
- the live HTTP contract is still meaningfully smaller than the product ambition and still has
  shallow areas such as dashboard reporting

That is not inherently bad, but it changes how the project should be evaluated. The repo is not
backend-empty anymore. It is backend-structured with a real admin and auth surface, but it still
has unfinished modules and route families.

### Net assessment

This is still one of the biggest structural truths the analysis has to capture. The backend should
not be described as a one-file scaffold, and it should not be described as a feature-complete API
either. It is an intentionally prepared module system with a meaningful but still incomplete set of
exposed behaviors.

## Decision 13: Keep Multi-Database Responsibilities Explicit Even Before Full Usage

The repo still clearly assigns responsibilities to PostgreSQL, MongoDB, Redis, and Kafka, and now
that separation is represented in code as well as docs.

### Why this helps

- The project avoids one abstraction to rule them all.
- The infra/services and the backend package layout reinforce the same architectural story.
- The current code already shows where relational persistence, document storage, caching, and
  publishing logic will live as the system grows.

### Why it still needs proof

- The current live request flows exercise those responsibilities, but not yet as broadly or deeply
  as the target architecture suggests.
- Some adapters are still lightweight implementations.
- The architectural story is stronger than the current user-visible product behavior.

### Net assessment

This remains a coherent strategy. It is no longer just academic, but it is not fully operational
yet either.

## Biggest Structural Strengths

- The repo has a clear point of view about architecture, environment, and delivery.
- The monorepo workflow is consistent and well supported by root scripts.
- The web app has a clean, feature-first structure instead of a route-only scaffold.
- The backend now encodes modular-monolith boundaries in code, not just in docs.
- Architectural tests give the backend structure some real enforcement.
- CI and deployment paths are already defined, which makes the project easier to demonstrate and
  share.
- The diagnostics slice is still a valuable real integration path.

## Biggest Structural Weaknesses

- The live API surface is much smaller than the backend folder structure suggests.
- The frontend still presents more product surface area than the backend contract supports.
- The operational footprint remains heavy relative to the amount of live business behavior.
- Several infrastructure adapters are still placeholders or contract-oriented stand-ins.
- Richer dashboard behavior and fully broker-backed async processing still need more proof.

## Overall Judgment

ClubCRM's current structure is stronger and more mature than a typical early-stage scaffold, but it
is mature in a very specific way.

The repo is now well ahead on:

- development workflow
- operational setup
- documentation
- frontend organization
- backend module boundaries

The repo is still behind on:

- complete live backend route coverage
- real end-to-end feature slices
- proving the full multi-database design through broader user-visible behavior

That combination is not necessarily a problem. In fact, it is a defensible strategy for a course
project or a team deliberately building architecture ahead of implementation. The important update
is that the architecture is no longer only theoretical. The backend now contains real module, port,
adapter, and test scaffolding that makes the intended design visible in code.

The next challenge is not to redesign the structure. It is to cash it in. The project needs deeper
feature slices, especially around reporting and async processing, that make the existing
architecture earn its weight in real runtime behavior.

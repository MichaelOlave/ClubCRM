# Module Implementation Flow

## Purpose

Use this guide when you are adding functionality to an existing ClubCRM module or creating a new
module slice. The goal is to help contributors ship one coherent change at a time without drifting
away from the repo's current structure:

- `apps/web` stays feature-first under `src/features`
- `apps/api` stays module-first under `src/modules`
- shared workflow and verification stay rooted at the repository root

This guide is intentionally practical. It reflects the codebase as it exists today, not just the
target architecture.

Database-specific companion guides:

- [PostgreSQL Implementation Flow](postgresql-implementation-flow.md)
- [MongoDB Implementation Flow](mongodb-implementation-flow.md)
- [Redis Implementation Flow](redis-implementation-flow.md)
- [Kafka Implementation Flow](kafka-implementation-flow.md)

## Before You Touch Code

1. Read [README.md](../../README.md), [docs/contributing.md](../contributing.md), and [docs/architecture.md](../architecture.md).
2. Confirm whether the work is:
   - web-only
   - API-only
   - a cross-app slice that changes both the backend contract and the frontend behavior
3. Check the closest reference slice before inventing new structure:
   - API route baseline: `apps/api/src/modules/system/presentation/http/routes.py`
   - API module boundaries: `apps/api/src/modules/clubs/` and `apps/api/src/modules/forms/`
   - API dependency wiring: `apps/api/src/bootstrap/dependencies.py`
   - API router registration: `apps/api/src/presentation/http/router.py`
   - web feature composition: `apps/web/src/features/clubs/`, `apps/web/src/features/health/`
   - web route composition: `apps/web/src/app/(app)/clubs/page.tsx`

If the task would change repo structure, ports, the devcontainer workflow, or the health-check
baseline, treat that as separate work and document it explicitly.

## Step 1: Define the Slice

Write down the smallest user-visible or system-visible outcome you are adding.

Examples:

- "List clubs from the API instead of hard-coded web data"
- "Allow join-form submissions to be stored by the forms module"
- "Show announcement history on the club detail page"

Then answer these questions before coding:

1. Which business module owns the change?
2. Does the source of truth belong in PostgreSQL, MongoDB, Redis, or Kafka?
3. Does the change need a new HTTP endpoint, a new web route, or both?
4. What is the narrowest verification that proves the slice works?

If the answers are fuzzy, the implementation usually becomes fuzzy too.

## Step 2: Choose the Implementation Path

### Web-only change

Use this path when the behavior stays inside the Next.js app and does not require a new backend
contract yet.

Typical examples:

- new presentation on an existing route
- extending a feature-owned view model
- reorganizing UI within a feature

### API-only change

Use this path when you are growing a backend module, adapter, or route without changing the web app
yet.

Typical examples:

- a new query or command in an existing module
- a new module-owned HTTP endpoint
- a new repository, store, cache, or publisher adapter

### Cross-app change

Use this path when the frontend behavior depends on a new or changed backend response.

Typical examples:

- replacing hard-coded view-model data with live API data
- adding a form flow that posts to the API
- introducing a new dashboard or module detail endpoint and consuming it in the web app

When in doubt, split the work into:

1. backend contract and tests
2. frontend integration
3. docs follow-up

## Step 3: Implement API Module Functionality

Use this sequence for backend work in `apps/api`.

### 3.1 Pick the owning module

Place business logic under the owning feature module:

```text
apps/api/src/modules/<module>/
  domain/
  application/
    commands/
    queries/
    ports/
  presentation/
    http/
```

Keep the module boundary business-oriented. Do not add generic shared buckets when one module
clearly owns the behavior.

### 3.2 Model the domain change first

Add or update domain entities and value-like structures in:

```text
apps/api/src/modules/<module>/domain/
```

Keep domain code free of FastAPI, database clients, and infrastructure imports.

Use this layer for:

- business concepts
- invariants
- domain-friendly field names

### 3.3 Add the use case in `application`

Add one focused command or query:

```text
apps/api/src/modules/<module>/application/commands/
apps/api/src/modules/<module>/application/queries/
```

Keep the use case responsible for orchestration, not transport details.

Follow the current pattern used by:

- `apps/api/src/modules/clubs/application/queries/list_clubs.py`
- `apps/api/src/modules/forms/application/commands/submit_join_request.py`

### 3.4 Define ports before adapters

If the use case needs persistence, caching, or async side effects, add or extend a port in:

```text
apps/api/src/modules/<module>/application/ports/
```

Use capability-based names that describe the job:

- `...Repository` for PostgreSQL-backed relational access
- `...Store` for MongoDB-backed document persistence
- `...Cache` for Redis-backed read models
- `...Publisher` for Kafka-backed async publication

The application layer should depend on these interfaces, not on infrastructure classes.

### 3.5 Implement the infrastructure adapter

Put the concrete adapter under the right infrastructure package:

```text
apps/api/src/infrastructure/postgres/
apps/api/src/infrastructure/mongodb/
apps/api/src/infrastructure/redis/
apps/api/src/infrastructure/kafka/
```

Examples already in the repo:

- `apps/api/src/infrastructure/postgres/repositories/clubs.py`
- `apps/api/src/infrastructure/mongodb/stores/forms.py`
- `apps/api/src/infrastructure/redis/caches/clubs.py`
- `apps/api/src/infrastructure/kafka/publishers/forms.py`

### 3.6 Wire dependencies centrally

Register the concrete implementation in:

`apps/api/src/bootstrap/dependencies.py`

That file is the manual composition layer. Keep wiring there instead of instantiating infrastructure
objects inside route handlers or use cases.

### 3.7 Expose the HTTP surface

Add or extend the module router in:

`apps/api/src/modules/<module>/presentation/http/routes.py`

Use this layer for:

- FastAPI route definitions
- request parsing and validation
- translating HTTP input into application calls
- shaping response payloads

Then register the module router in:

`apps/api/src/presentation/http/router.py`

If the change is not ready to be public yet, stop before this step.

### 3.8 Add focused tests

At minimum, add or update unit tests that prove the application layer still respects module
boundaries.

Current examples:

- `apps/api/tests/unit/modules/clubs/test_boundaries.py`
- `apps/api/tests/unit/modules/forms/test_boundaries.py`

Add infrastructure tests when you introduce a new adapter contract under:

```text
apps/api/tests/unit/infrastructure/
```

## Step 4: Implement Web Module Functionality

Use this sequence for frontend work in `apps/web`.

### 4.1 Start from the route

Decide which route owns the UI entry point:

```text
apps/web/src/app/(app)/...
apps/web/src/app/(public)/...
```

Routes should stay thin. They compose feature exports rather than owning business logic.

Reference pages:

- `apps/web/src/app/(app)/clubs/page.tsx`
- `apps/web/src/app/(app)/system/health/page.tsx`

### 4.2 Put business-facing code in the feature folder

Add or extend the feature under:

```text
apps/web/src/features/<feature>/
  components/
  server/
  types/
  index.ts
```

Use the folder that owns the business concept. Avoid reaching for `components/ui` or `lib/` until
the code is truly generic.

### 4.3 Add or update server-side loaders/actions

Put server-only data loading and orchestration in:

`apps/web/src/features/<feature>/server/`

Current examples:

- `apps/web/src/features/clubs/server/index.ts`
- `apps/web/src/features/health/server/index.ts`
- `apps/web/src/features/members/server/index.ts`

Use feature server modules for:

- calling the API
- assembling view models
- translating backend payloads into UI-friendly structures

### 4.4 Keep types owned by the feature when possible

Add feature-local types in:

`apps/web/src/features/<feature>/types/`

Only move a type to `apps/web/src/types/` when it is truly app-wide. Prefer local ownership first.

### 4.5 Export through the feature surface

Update:

- `apps/web/src/features/<feature>/index.ts`
- optionally `apps/web/src/features/<feature>/server/index.ts`

Routes should import from the feature surface, not from deep internal files when a feature export is
available.

### 4.6 Compose the route page

Keep route files focused on:

- calling the feature loader
- rendering the feature component tree
- setting route-level behavior like `dynamic = "force-dynamic"` when needed

Avoid pushing generic layout concerns into a feature when they belong in `components/layout`.

## Step 5: Connect a Cross-App Vertical Slice

When the change affects both apps, use this order:

1. Define the backend contract first.
2. Add or update API tests around the module use case and route.
3. Add or update the web feature server loader that calls the endpoint.
4. Update the route page and feature components.
5. Remove or reduce temporary hard-coded data only after the live path is working.

For HTTP calls from the web app:

- prefer feature-owned server loaders over route-local fetch logic
- use shared helpers such as `apps/web/src/lib/api/client.ts`
- keep environment access centralized through `apps/web/src/lib/env/`

If you change request or response shapes, review both sides in the same branch so the contract stays
coherent.

## Step 6: Check Documentation Impact

Update docs in the same change when teammates need to know about:

- a new route or user flow
- a new module or module responsibility
- a new verification step
- a new environment or workflow assumption

For most module growth, the minimum doc touch is one of:

- [README.md](../../README.md)
- [docs/contributing.md](../contributing.md)
- [docs/architecture.md](../architecture.md)
- a module-specific guide like this one

## Step 7: Verify the Narrowest Meaningful Surface

Run checks from the repository root.

Use:

- `pnpm lint:web` for frontend-only changes
- `pnpm check:api` for backend-only changes
- `pnpm lint` for shared or cross-app changes
- `pnpm verify` when the behavior, contract, or shared tooling changed materially

Also verify the actual slice you changed:

- hit the FastAPI route locally for API work
- load the Next.js route for web work
- exercise both together for cross-app work

## Step 8: Finish with a Small Handoff Checklist

Before you consider the module change done, confirm:

- the owning module is clear
- the code lives in the expected layer
- infrastructure dependencies are wired through ports and `bootstrap/dependencies.py`
- routes stay thin
- feature exports are clean
- tests cover the new behavior or boundary
- docs reflect the new functionality

If you cannot check one of those boxes, call it out in the handoff instead of leaving it implicit.

## Quick Reference

### API module checklist

1. Update domain structures.
2. Add a command or query.
3. Add or extend ports.
4. Implement infrastructure adapters.
5. Wire dependencies.
6. Expose routes.
7. Register the router.
8. Add tests.
9. Run `pnpm check:api` or broader checks as needed.

### Web feature checklist

1. Identify the owning route.
2. Add or extend the feature folder.
3. Add server loaders or actions.
4. Add or update feature types.
5. Export through `index.ts`.
6. Compose the route page.
7. Run `pnpm lint:web` or broader checks as needed.

### Cross-app checklist

1. Define the API contract.
2. Implement and test the backend slice.
3. Integrate through the web feature server module.
4. Update the route and UI.
5. Run shared verification.

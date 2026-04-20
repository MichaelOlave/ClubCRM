# API

FastAPI service for ClubCRM, organized as feature modules with capability-based database abstractions under `src/`.

## Structure

```text
src/
  main.py
  config/
    settings.py
  bootstrap/
    app_factory.py
    dependencies.py
  presentation/
    http/
      router.py
      exception_handlers.py
  modules/
    system/
      presentation/
        http/
          routes.py
    audit/
      application/
        commands/
        ports/
        queries/
      domain/
      presentation/
        http/
    dashboard/
      application/
        ports/
      domain/
      presentation/
        http/
    clubs/
      domain/
      application/
        commands/
        queries/
        ports/
      presentation/
        http/
    members/
    memberships/
    events/
    announcements/
    forms/
    auth/
  infrastructure/
    auth/
      providers/
    postgres/
      client.py
      unit_of_work.py
      repositories/
    mongodb/
      client.py
      stores/
    redis/
      client.py
      caches/
      sessions/
    kafka/
      client.py
      publishers/
tests/
  unit/
    modules/
    infrastructure/
```

The API does not use one generic database gateway. Abstractions live in
`modules/*/application/ports/` and are expressed by capability:

- `Repository` for relational data in PostgreSQL
- `Store` for document persistence in MongoDB
- `Cache` for Redis-backed read models
- `Publisher` for Kafka-backed async side effects

Concrete adapters live in `src/infrastructure/*`, and `src/bootstrap/dependencies.py` is the
manual wiring layer that binds ports to implementations.

## Run locally

Use the repository devcontainer for local development. Before opening it, create `.env` from
`.env.example` at the repository root. The devcontainer opens the repo at `/workspace`, runs its
bootstrap `postCreateCommand` (`python3 ./scripts/bootstrap.py`), waits for the local backing services
to report healthy, and starts the API service on container port `8000` by default.

The devcontainer Compose stack also starts these supporting services:

- PostgreSQL on `5432`
- MongoDB on `27017`
- Redis on `6379`
- Kafka on `9092`

If you need to restart the API from the workspace terminal, use the root script:

```bash
pnpm dev:api
```

That development entrypoint runs Uvicorn with reload watching limited to `src/` and forces polling
for file changes so API startup and live reload remain reliable in Windows-hosted devcontainers.
It also runs `alembic upgrade head` first so the local database-backed routes start against the
current schema. The PostgreSQL seed flow loads the baseline relational dataset when the local
database is still empty and backfills the default Champlain org-admin grants for
`developer@clubcrm.local` and `michael.olave@mymail.champlain.edu` when that organization already
exists. The empty-database seed also provisions the local test-login club manager as a seeded
member with manager access to the baseline club. The MongoDB seed flow now adds baseline
`join_requests` documents when the `clubcrm` database is empty so form-review flows have demo data
too.

The API defaults to host port `8000` when the devcontainer is running, or the next available host
port if `8000` is already in use. The resolved binding is written to
`.devcontainer/docker-compose.ports.yml`.

## Application Routes

- `GET /health` powers the web diagnostics page at `/system/health`
- `/auth/*` owns login, callback, session, and logout for the backend-owned auth flow
- `GET /audit-logs` returns the protected admin audit trail used by `/system/audit`
- `GET /dashboard/summary/{club_id}` returns dashboard summary data for an authorized club
- `/forms/*` owns public join-request submission plus protected pending, approve, and deny flows
- `/clubs/*` includes CRUD plus club-manager grant management, now exposing stable club `slug`
  values alongside internal IDs and enforcing per-organization uniqueness for club URL slugs
- `/members/*` and `/memberships/*` provide the current roster-management surface
- `/events/*` and `/announcements/*` provide the current club activity surface

FastAPI's default docs remain enabled as well:

- `/docs`
- `/redoc`
- `/openapi.json`

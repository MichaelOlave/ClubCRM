# API

FastAPI service for ClubCRM, organized as feature modules with capability-based database
abstractions under `src/`.

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

The API defaults to host port `8000` when the devcontainer is running, or the next available host
port if `8000` is already in use. The resolved binding is written to
`.devcontainer/docker-compose.ports.yml`.

## Application Routes

- `GET /health` used by the web diagnostics page at `/system/health`
- `GET /auth/login` starts the backend-owned Auth0 login flow or local bypass flow
- `GET /auth/callback` completes the Auth0 callback and creates the backend session cookie
- `GET /auth/session` returns the current backend session plus a CSRF token for same-origin requests
- `POST /auth/logout` clears the backend auth session and redirects through logout

FastAPI's default docs remain enabled as well:

- `/docs`
- `/redoc`
- `/openapi.json`

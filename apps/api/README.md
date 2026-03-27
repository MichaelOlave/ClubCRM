# API

Basic FastAPI service for ClubCRM, following the documented backend layout under `src/`.

## Structure

```text
src/
  main.py
  config.py
  presentation/
    http/
      routes/
```

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

The API defaults to host port `8000` when the devcontainer is running, or the next available host
port if `8000` is already in use. The resolved binding is written to
`.devcontainer/docker-compose.ports.yml`.

## Application Route

- `GET /health` used by the web diagnostics page at `/system/health`

FastAPI's default docs remain enabled as well:

- `/docs`
- `/redoc`
- `/openapi.json`

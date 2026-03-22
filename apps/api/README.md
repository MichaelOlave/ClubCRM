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

Use the repository devcontainer for local development. Before opening it, create `.env` from `.env.example` at the repository root. The devcontainer opens the repo at `/workspace`, runs `.devcontainer/post-create.sh`, and starts the API service on port `8000`.

The devcontainer Compose stack also starts these supporting services:

- PostgreSQL on `5432`
- MongoDB on `27017`
- Redis on `6379`
- Kafka on `9092`

If you need to restart the API from the workspace terminal, use the root script:

```bash
pnpm dev:api
```

The API is available at `http://127.0.0.1:8000` when the devcontainer is running.

## Endpoints

- `GET /health`

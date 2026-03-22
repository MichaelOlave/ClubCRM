# API

Basic FastAPI service for ClubCRM, following the documented backend layout under `src/`.

## Structure

```text
src/
  main.py
  presentation/
    http/
      routes/
```

## Run locally

Use the repository devcontainer for local development. The devcontainer opens the repo at `/workspace`, runs `.devcontainer/post-create.sh`, and starts the API through Docker Compose on port `8000`.

The local stack also starts these supporting services:

- PostgreSQL on `5432`
- MongoDB on `27017`
- Redis on `6379`
- Kafka on `9092`

If you want to start the full project stack outside the editor-integrated devcontainer flow, run:

```bash
docker compose -f infra/docker-compose.yml up --build
```

If you want to work from the container shell directly:

```bash
cd /workspace/apps/api
uvicorn src.main:app --reload
```

The API will start on `http://127.0.0.1:8000`.

In the full devcontainer workflow, the `api` compose service already starts the development server for you and depends on the local data services being available.

## Endpoints

- `GET /health`

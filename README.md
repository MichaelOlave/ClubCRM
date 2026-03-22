# ClubCRM

ClubCRM is a multi-database club management platform with:

- Next.js web app
- FastAPI API
- PostgreSQL for relational data
- MongoDB for document-style form submissions
- Redis for caching and short-lived data
- Kafka for domain events and async workflows

## Local Development

The recommended workflow is the repository devcontainer.

The devcontainer uses:

- `infra/docker-compose.yml`
- `.devcontainer/docker-compose.devcontainer.yml`

Services started by the devcontainer:

- `workspace`
- `web`
- `api`
- `postgres`
- `mongodb`
- `redis`
- `kafka`

Forwarded ports:

- `3000` web
- `8000` api
- `5432` postgres
- `27017` mongodb
- `6379` redis
- `9092` kafka

Create your local environment file before starting the stack:

```bash
cp .env.example .env
```

To run the application stack directly with Docker Compose:

```bash
docker compose -f infra/docker-compose.yml up --build
```

The Docker services and local dev scripts both read configuration from the repository root `.env`.

To start the devcontainer-only workspace override as well:

```bash
docker compose -f infra/docker-compose.yml -f .devcontainer/docker-compose.devcontainer.yml up --build
```

## Quality Checks

Bootstrap dependencies and install Git hooks:

```bash
pnpm bootstrap
```

Run all configured Git hooks manually:

```bash
apps/api/.venv/bin/pre-commit run --all-files
```

Run repository checks locally:

```bash
pnpm verify
```

## Docs

- `docs/contributing.md` for contribution workflow and code standards
- `docs/architecture.md` for system structure and local environment rules
- `docs/schema.md` for data modeling notes
- `docs/decisions.md` for architecture decisions
- `docs/team-execution-plan.md` for scope and ownership guidance

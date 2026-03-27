# PostgreSQL Implementation Flow

## Purpose

Use PostgreSQL for ClubCRM's relational system of record. This is where core business data should
live when correctness, relationships, and transactional consistency matter.

Examples from the documented architecture include:

- organizations
- clubs
- members
- memberships
- events
- announcements
- admin and auth-related records

## Use PostgreSQL When

Choose PostgreSQL when the new functionality needs:

- strong ownership of business-critical data
- relational links between records
- constraints or transactional boundaries
- a repository-style API from the application layer

If the change is primarily a flexible submission payload, a cache, or an async event, use MongoDB,
Redis, or Kafka instead.

## Current Repo Pattern

Reference files in the current backend:

- `apps/api/src/modules/*/application/ports/*Repository`
- `apps/api/src/infrastructure/postgres/repositories/`
- `apps/api/src/infrastructure/postgres/unit_of_work.py`
- `apps/api/src/bootstrap/dependencies.py`
- `apps/api/tests/unit/infrastructure/postgres/test_contracts.py`

Current repository examples already exist for:

- clubs
- members
- memberships
- events
- announcements
- auth

## Step-by-Step Flow

### 1. Confirm the data belongs in the relational system of record

Ask:

1. Is this business-critical data?
2. Does it need stable identifiers and relationships to other records?
3. Would constraints or transactions make the behavior safer?

If the answer is yes, PostgreSQL is likely the right fit.

### 2. Start in the owning module

Keep the change inside the business module that owns the behavior:

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

Add or update the domain entity first so the rest of the slice has a stable model to use.

### 3. Add or extend a repository port

Define the relational capability under:

```text
apps/api/src/modules/<module>/application/ports/
```

Use `...Repository` naming for module-owned relational access.

The application layer should depend on the port, not on `PostgresClient` directly.

### 4. Add or update the use case

Implement the command or query that consumes the repository under:

```text
apps/api/src/modules/<module>/application/commands/
apps/api/src/modules/<module>/application/queries/
```

Keep orchestration here and keep SQL or client details out of this layer.

### 5. Implement the repository adapter

Create or extend the concrete adapter under:

```text
apps/api/src/infrastructure/postgres/repositories/
```

Use existing files as references:

- `apps/api/src/infrastructure/postgres/repositories/clubs.py`
- `apps/api/src/infrastructure/postgres/repositories/members.py`
- `apps/api/src/infrastructure/postgres/repositories/events.py`

The adapter should translate between the relational store and the module's domain entities.

### 6. Extend the unit of work when transactions matter

If the feature coordinates multiple relational writes, extend:

`apps/api/src/infrastructure/postgres/unit_of_work.py`

Use the unit-of-work layer when the change needs one transactional boundary across multiple
repositories. If the feature is read-only or uses one simple repository call, a standalone
repository port may be enough.

### 7. Wire the adapter through bootstrap

Register the adapter in:

`apps/api/src/bootstrap/dependencies.py`

Keep repository construction centralized there. Do not instantiate PostgreSQL adapters inside route
handlers.

### 8. Expose the HTTP route if needed

If the feature is public through the API, translate the HTTP request into the use case under:

`apps/api/src/modules/<module>/presentation/http/routes.py`

Then include the module router from:

`apps/api/src/presentation/http/router.py`

### 9. Add focused tests

At minimum, add or update:

- module-level tests under `apps/api/tests/unit/modules/<module>/`
- PostgreSQL contract tests under `apps/api/tests/unit/infrastructure/postgres/`

Use the existing contract test as the baseline:

`apps/api/tests/unit/infrastructure/postgres/test_contracts.py`

## Example Snippet

This is the typical PostgreSQL flow in ClubCRM: define a repository port in the module, consume it
from a use case, then bind a concrete Postgres adapter through bootstrap.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

from src.infrastructure.postgres.client import PostgresClient
from src.modules.clubs.domain.entities import Club


# Application port: the use case depends on this contract instead of a concrete database class.
class ClubRepository(ABC):
    @abstractmethod
    def list_clubs(self, organization_id: str) -> list[Club]:
        """Return clubs for a single organization."""


# Application query: orchestration lives here and stays unaware of SQL or Postgres details.
@dataclass
class ListClubs:
    repository: ClubRepository

    def execute(self, organization_id: str) -> list[Club]:
        return self.repository.list_clubs(organization_id)


# Infrastructure adapter: this is where relational query logic would eventually live.
class PostgresClubRepository(ClubRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def list_clubs(self, organization_id: str) -> list[Club]:
        _ = (self.client, organization_id)
        raise NotImplementedError("Implement the relational query here.")
```

```python
from src.infrastructure.postgres.repositories.clubs import PostgresClubRepository
from src.modules.clubs.application.ports.club_repository import ClubRepository


# Bootstrap wiring: bind the application port to the concrete Postgres implementation.
def get_club_repository() -> ClubRepository:
    return PostgresClubRepository(client=get_postgres_client())
```

## Verification

Run the narrowest meaningful checks from the repo root:

- `pnpm check:api` for backend-only work
- `pnpm lint` if the change touches shared behavior or multiple layers
- `pnpm verify` when the feature materially changes application behavior

Also exercise the actual route or use case path that now depends on PostgreSQL.

## Do Not Use PostgreSQL For

Avoid PostgreSQL when the feature is really:

- a flexible or raw submission document
- a cache or read-model accelerator
- an async event notification

Those belong in MongoDB, Redis, or Kafka.

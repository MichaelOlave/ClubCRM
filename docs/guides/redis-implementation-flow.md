# Redis Implementation Flow

## Purpose

Use Redis for fast, disposable read models and short-lived data. Redis is a speed layer in ClubCRM,
not the source of permanent truth.

The documented Redis responsibilities include:

- cached dashboard summaries
- recent club activity cache
- session or token data if needed
- frequently requested lookup results

## Use Redis When

Choose Redis when the new functionality needs:

- a cached read path
- a quick lookup that can be rebuilt from another source of truth
- short-lived data where performance matters more than permanent storage

Redis should accelerate a feature, not define its correctness.

## Current Repo Pattern

Reference files in the current backend:

- `apps/api/src/modules/clubs/application/ports/club_summary_cache.py`
- `apps/api/src/modules/clubs/application/queries/list_clubs.py`
- `apps/api/src/infrastructure/redis/caches/clubs.py`
- `apps/api/src/infrastructure/redis/caches/members.py`
- `apps/api/src/bootstrap/dependencies.py`
- `apps/api/tests/unit/infrastructure/redis/test_contracts.py`

The current repo pattern treats caches as optional collaborators in the application layer.

## Step-by-Step Flow

### 1. Confirm Redis is an accelerator, not the source of truth

Ask:

1. Can the data be reconstructed from PostgreSQL, MongoDB, or another primary source?
2. Is this read path hot enough to benefit from caching?
3. Will the feature still work correctly on a cache miss?

If the feature fails without Redis, the design probably needs another pass.

### 2. Add or extend a cache port

Define the cache contract under:

```text
apps/api/src/modules/<module>/application/ports/
```

Use `...Cache` naming.

The port should expose the minimum operations the use case actually needs, such as:

- `get`
- `set`
- `delete` or invalidation behavior when required

### 3. Integrate the cache into the query or command carefully

Add or update the application logic under:

```text
apps/api/src/modules/<module>/application/queries/
apps/api/src/modules/<module>/application/commands/
```

Prefer the current pattern used by:

`apps/api/src/modules/clubs/application/queries/list_clubs.py`

That flow is a good baseline:

1. check cache
2. fall back to the primary store on a miss
3. repopulate cache
4. return the canonical result

### 4. Implement the Redis adapter

Create the concrete cache under:

```text
apps/api/src/infrastructure/redis/caches/
```

Reference:

- `apps/api/src/infrastructure/redis/caches/clubs.py`
- `apps/api/src/infrastructure/redis/caches/members.py`

Keep Redis client details inside this adapter layer.

### 5. Wire the cache through bootstrap

Register the cache in:

`apps/api/src/bootstrap/dependencies.py`

Keep the cache optional where it makes sense so the use case still has a correct non-cached path.

### 6. Add invalidation behavior if writes can stale the cache

If another command changes the cached data, update the design to clear or refresh the relevant cache
entries. Do not add caching without deciding how stale data gets corrected.

### 7. Add focused tests

At minimum, add or update:

- module tests under `apps/api/tests/unit/modules/<module>/`
- Redis contract tests under `apps/api/tests/unit/infrastructure/redis/`

Reference:

`apps/api/tests/unit/infrastructure/redis/test_contracts.py`

## Example Snippet

This is the typical Redis flow in ClubCRM: keep the cache behind a port, treat it as optional in the
use case, and always fall back to the primary source of truth on a miss.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

from src.infrastructure.redis.client import RedisClient
from src.modules.clubs.application.ports.club_repository import ClubRepository
from src.modules.clubs.domain.entities import Club


# Application port: the query can use a cache without depending on Redis directly.
class ClubSummaryCache(ABC):
    @abstractmethod
    def get(self, organization_id: str) -> list[Club] | None:
        """Return cached clubs for an organization if present."""

    @abstractmethod
    def set(self, organization_id: str, clubs: list[Club]) -> None:
        """Store a club summary for an organization."""


# Application query: try the cache first, then fall back to the primary repository.
@dataclass
class ListClubs:
    repository: ClubRepository
    cache: ClubSummaryCache | None = None

    def execute(self, organization_id: str) -> list[Club]:
        if self.cache is not None:
            cached = self.cache.get(organization_id)
            if cached is not None:
                return cached

        clubs = self.repository.list_clubs(organization_id)

        if self.cache is not None:
            self.cache.set(organization_id, clubs)

        return clubs


# Infrastructure adapter: owns the Redis-specific storage behavior for the cached read model.
class RedisClubSummaryCache(ClubSummaryCache):
    def __init__(self, client: RedisClient) -> None:
        self.client = client
        self._cache: dict[str, list[Club]] = {}

    def get(self, organization_id: str) -> list[Club] | None:
        _ = self.client
        return self._cache.get(organization_id)

    def set(self, organization_id: str, clubs: list[Club]) -> None:
        _ = self.client
        self._cache[organization_id] = list(clubs)
```

```python
from src.infrastructure.redis.caches.clubs import RedisClubSummaryCache
from src.modules.clubs.application.ports.club_summary_cache import ClubSummaryCache


# Bootstrap wiring: inject the Redis-backed cache wherever the application requests the port.
def get_club_summary_cache() -> ClubSummaryCache:
    return RedisClubSummaryCache(client=get_redis_client())
```

## Verification

Run the narrowest meaningful checks from the repo root:

- `pnpm check:api` for backend-only work
- `pnpm lint` if the change crosses module or infrastructure boundaries
- `pnpm verify` when the behavior changes materially

Also verify both paths:

- cache miss behavior
- cache hit behavior

## Do Not Use Redis For

Avoid Redis when the feature is really:

- the permanent system of record
- a flexible submission document
- an async domain event

Those belong in PostgreSQL, MongoDB, or Kafka.

# MongoDB Implementation Flow

## Purpose

Use MongoDB for flexible, document-style data that should be stored without forcing it into the
relational system of record.

The documented MongoDB responsibilities in ClubCRM include:

- raw join form submissions
- interest forms
- RSVP payloads
- feedback submissions

## Use MongoDB When

Choose MongoDB when the new functionality needs:

- semi-structured or evolving payloads
- storage of raw submission data
- a document-style persistence boundary owned by one module

MongoDB is a good fit for form-style inputs where the payload may grow over time without requiring a
fully normalized relational model on day one.

## Current Repo Pattern

Reference files in the current backend:

- `apps/api/src/modules/forms/application/ports/join_request_store.py`
- `apps/api/src/infrastructure/mongodb/stores/forms.py`
- `apps/api/src/bootstrap/dependencies.py`
- `apps/api/tests/unit/infrastructure/mongodb/test_contracts.py`

The current live pattern uses a `Store` capability rather than a repository.

## Step-by-Step Flow

### 1. Confirm the payload belongs in a document store

Ask:

1. Is this a flexible submission or semi-structured payload?
2. Does the module need to preserve the raw input shape?
3. Is this data important, but not the core relational system of record?

If yes, MongoDB is probably the right path.

### 2. Model the domain object in the owning module

Keep the shape module-owned under:

```text
apps/api/src/modules/<module>/domain/
```

The domain entity should represent the business concept, even if the stored payload remains flexible.

### 3. Add or extend a store port

Define the document persistence contract under:

```text
apps/api/src/modules/<module>/application/ports/
```

Use `...Store` naming for MongoDB-backed behavior.

Reference:

`apps/api/src/modules/forms/application/ports/join_request_store.py`

### 4. Add the command or query that uses the store

Put the use case under:

```text
apps/api/src/modules/<module>/application/commands/
apps/api/src/modules/<module>/application/queries/
```

The application layer should call the store port and keep MongoDB client details out of the use
case.

### 5. Implement the MongoDB adapter

Create the concrete adapter under:

```text
apps/api/src/infrastructure/mongodb/stores/
```

Reference:

`apps/api/src/infrastructure/mongodb/stores/forms.py`

This layer can handle persistence details like identifier generation or serialization to the
document shape.

### 6. Wire the store through bootstrap

Register the store in:

`apps/api/src/bootstrap/dependencies.py`

Keep construction there so route handlers and use cases stay infrastructure-agnostic.

### 7. Expose the API route if needed

Translate HTTP input into the module command or query under:

`apps/api/src/modules/<module>/presentation/http/routes.py`

Only the presentation layer should know about request parsing and HTTP concerns.

### 8. Add focused tests

At minimum, add or update:

- module tests under `apps/api/tests/unit/modules/<module>/`
- MongoDB contract tests under `apps/api/tests/unit/infrastructure/mongodb/`

Reference:

`apps/api/tests/unit/infrastructure/mongodb/test_contracts.py`

## Example Snippet

This is the typical MongoDB flow in ClubCRM: define a store port, call it from the module use case,
and let the adapter handle document-oriented persistence details.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, replace
from uuid import uuid4

from src.infrastructure.mongodb.client import MongoDBClient
from src.modules.forms.domain.entities import JoinRequest


# Application port: the forms module asks for document persistence through this contract.
class JoinRequestStore(ABC):
    @abstractmethod
    def save(self, join_request: JoinRequest) -> JoinRequest:
        """Persist a raw join request document."""


# Application command: orchestrates the workflow without knowing MongoDB details.
@dataclass
class SubmitJoinRequest:
    store: JoinRequestStore

    def execute(self, join_request: JoinRequest) -> JoinRequest:
        return self.store.save(join_request)


# Infrastructure adapter: responsible for document-store behavior like assigning an id.
class MongoDBJoinRequestStore(JoinRequestStore):
    def __init__(self, client: MongoDBClient) -> None:
        self.client = client

    def save(self, join_request: JoinRequest) -> JoinRequest:
        _ = self.client

        if join_request.id is not None:
            return join_request

        return replace(join_request, id=str(uuid4()))
```

```python
from src.infrastructure.mongodb.stores.forms import MongoDBJoinRequestStore
from src.modules.forms.application.ports.join_request_store import JoinRequestStore


# Bootstrap wiring: expose the concrete MongoDB store behind the application port.
def get_join_request_store() -> JoinRequestStore:
    return MongoDBJoinRequestStore(client=get_mongodb_client())
```

## Verification

Run the narrowest meaningful checks from the repo root:

- `pnpm check:api` for backend-only work
- `pnpm lint` if the change crosses module or infrastructure boundaries
- `pnpm verify` when the behavior changes materially

Also exercise the actual command or route that stores and reads the MongoDB-backed document.

## Do Not Use MongoDB For

Avoid MongoDB when the feature is really:

- core club, member, membership, or event data
- a cache that can be regenerated
- an async event publication

Those belong in PostgreSQL, Redis, or Kafka instead.

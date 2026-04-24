# Kafka Implementation Flow

## Purpose

Use Kafka for async domain events and non-blocking workflows. In ClubCRM, Kafka is the intended
event backbone for side effects, not part of the core CRUD correctness path. The current publisher
adapters are still scaffolded and record event metadata in memory instead of sending broker-backed
messages.

Documented Kafka responsibilities include events such as:

- `club_created`
- `member_added`
- `form_submitted`
- `event_created`
- `announcement_published`

## Use Kafka When

Choose Kafka when the new functionality needs:

- async publication after a successful state change
- a clear event signal for downstream processing or demos
- non-blocking side effects that should not reshape the main request path

If the feature is really about persistence or caching, use PostgreSQL, MongoDB, or Redis instead.

## Current Repo Pattern

Reference files in the current backend:

- `apps/api/src/modules/clubs/application/ports/club_event_publisher.py`
- `apps/api/src/modules/forms/application/ports/form_submission_publisher.py`
- `apps/api/src/modules/forms/application/commands/submit_join_request.py`
- `apps/api/src/infrastructure/kafka/publishers/clubs.py`
- `apps/api/src/infrastructure/kafka/publishers/forms.py`
- `apps/api/src/bootstrap/dependencies.py`
- `apps/api/tests/unit/infrastructure/kafka/test_contracts.py`

The current application pattern treats publishers as optional collaborators that run after the core
state change succeeds. Treat this as the stable boundary where a real Kafka producer can be added
without changing the owning use case.

## Step-by-Step Flow

### 1. Confirm the feature should publish an async event

Ask:

1. Is there already a primary state change elsewhere?
2. Should the event happen after that state change rather than replace it?
3. Can the feature tolerate event publication as a secondary concern?

If no state change exists yet, design the primary write path first.

### 2. Add or extend a publisher port

Define the contract under:

```text
apps/api/src/modules/<module>/application/ports/
```

Use `...Publisher` naming for Kafka-backed behavior.

Keep the port narrow and event-specific.

### 3. Publish from the owning use case

Add or update the command that should publish the event under:

```text
apps/api/src/modules/<module>/application/commands/
```

Reference:

`apps/api/src/modules/forms/application/commands/submit_join_request.py`

The usual sequence is:

1. perform the primary persistence action
2. publish the event if a publisher is available
3. return the canonical result

### 4. Implement the Kafka publisher

Create the concrete adapter under:

```text
apps/api/src/infrastructure/kafka/publishers/
```

Reference:

- `apps/api/src/infrastructure/kafka/publishers/clubs.py`
- `apps/api/src/infrastructure/kafka/publishers/forms.py`

Keep topic naming and payload shaping inside the adapter so the application layer stays simple.

### 5. Wire the publisher through bootstrap

Register the adapter in:

`apps/api/src/bootstrap/dependencies.py`

Keep construction centralized there instead of creating Kafka clients in route handlers.

### 6. Keep HTTP routes thin

If the feature is exposed by the API, the route should call the command and let the command manage
the publisher collaboration. Route handlers should not publish Kafka events directly.

### 7. Add focused tests

At minimum, add or update:

- module tests under `apps/api/tests/unit/modules/<module>/`
- Kafka contract tests under `apps/api/tests/unit/infrastructure/kafka/`

Reference:

`apps/api/tests/unit/infrastructure/kafka/test_contracts.py`

Tests should prove the adapter matches the publisher port and emits the expected topic or payload
shape.

## Example Snippet

This is the typical Kafka flow in ClubCRM: the command performs the primary state change first, then
publishes an event through an optional publisher port.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

from src.infrastructure.kafka.client import KafkaClient
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


# Application port: the command publishes an event through this contract, not through Kafka directly.
class FormSubmissionPublisher(ABC):
    @abstractmethod
    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        """Publish a join request submission event."""


# Application command: perform the primary write first, then publish the async event.
@dataclass
class SubmitJoinRequest:
    store: JoinRequestStore
    publisher: FormSubmissionPublisher | None = None

    def execute(self, join_request: JoinRequest) -> JoinRequest:
        stored_join_request = self.store.save(join_request)

        if self.publisher is not None:
            self.publisher.publish_join_request_submitted(stored_join_request)

        return stored_join_request


# Infrastructure adapter: translate the publication request into a Kafka event payload.
class KafkaFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self, client: KafkaClient) -> None:
        self.client = client
        self.published_events: list[dict[str, str]] = []

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = self.client
        self.published_events.append(
            {
                "topic": "form_submitted",
                "club_id": join_request.club_id,
                "organization_id": join_request.organization_id,
            }
        )
```

```python
from src.infrastructure.kafka.publishers.forms import KafkaFormSubmissionPublisher
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)


# Bootstrap wiring: bind the publisher port to the Kafka-backed implementation.
def get_form_submission_publisher() -> FormSubmissionPublisher:
    return KafkaFormSubmissionPublisher(client=get_kafka_client())
```

## Verification

Run the narrowest meaningful checks from the repo root:

- `pnpm check:api` for backend-only work
- `pnpm lint` if the change crosses module or infrastructure boundaries
- `pnpm verify` when the behavior changes materially

Also exercise the command path that now publishes the event.

## Do Not Use Kafka For

Avoid Kafka when the feature is really:

- the only persistence path for core business data
- a substitute for a relational write
- a cache or lookup accelerator

Kafka should complement the main write path, not replace it.

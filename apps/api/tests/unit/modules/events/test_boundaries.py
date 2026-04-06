import unittest
from datetime import UTC, datetime

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.events.application.commands.create_event import CreateEvent
from src.modules.events.application.commands.delete_event import DeleteEvent
from src.modules.events.application.commands.update_event import UpdateEvent
from src.modules.events.application.ports.event_repository import EventRepository
from src.modules.events.application.queries.get_event import GetEvent
from src.modules.events.application.queries.list_events import ListEvents
from src.modules.events.domain.entities import Event


class FakeEventRepository(EventRepository):
    def __init__(self) -> None:
        self.events: dict[str, Event] = {}

    def list_events(self, club_id: str) -> list[Event]:
        return [event for event in self.events.values() if event.club_id == club_id]

    def get_event(self, event_id: str) -> Event:
        return self.events[event_id]

    def create_event(
        self,
        *,
        club_id: str,
        title: str,
        description: str,
        starts_at,
        location: str | None = None,
        ends_at=None,
    ) -> Event:
        event = Event(
            id="event-1",
            club_id=club_id,
            title=title,
            description=description,
            starts_at=starts_at,
            location=location,
            ends_at=ends_at,
        )
        self.events[event.id] = event
        return event

    def update_event(
        self,
        event_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        starts_at=None,
        location: str | None = None,
        ends_at=None,
    ) -> Event:
        current = self.events[event_id]
        updated = Event(
            id=current.id,
            club_id=current.club_id,
            title=title or current.title,
            description=description or current.description,
            starts_at=starts_at or current.starts_at,
            location=location if location is not None else current.location,
            ends_at=ends_at if ends_at is not None else current.ends_at,
        )
        self.events[event_id] = updated
        return updated

    def delete_event(self, event_id: str) -> None:
        self.events.pop(event_id, None)


class EventBoundaryTests(unittest.TestCase):
    def test_events_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/events/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_event_use_cases_delegate_to_the_repository_port(self) -> None:
        repository = FakeEventRepository()
        created = CreateEvent(repository=repository).execute(
            club_id="club-1",
            title="Kickoff",
            description="Opening meeting",
            starts_at=datetime(2026, 4, 6, 18, 0, tzinfo=UTC),
        )

        self.assertEqual(created.title, "Kickoff")
        self.assertEqual(ListEvents(repository=repository).execute("club-1")[0].id, "event-1")

        updated = UpdateEvent(repository=repository).execute(
            "event-1",
            title="Kickoff Night",
        )
        self.assertEqual(updated.title, "Kickoff Night")
        self.assertEqual(GetEvent(repository=repository).execute("event-1").title, "Kickoff Night")

        DeleteEvent(repository=repository).execute("event-1")
        self.assertEqual(ListEvents(repository=repository).execute("club-1"), [])

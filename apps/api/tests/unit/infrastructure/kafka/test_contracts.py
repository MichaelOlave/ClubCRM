import unittest
from unittest.mock import MagicMock

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.publishers.announcements import (
    KafkaAnnouncementEventPublisher,
)
from src.infrastructure.kafka.publishers.clubs import KafkaClubEventPublisher
from src.infrastructure.kafka.publishers.events import KafkaEventEventPublisher
from src.infrastructure.kafka.publishers.forms import KafkaFormSubmissionPublisher
from src.infrastructure.kafka.publishers.members import KafkaMemberEventPublisher
from src.modules.announcements.application.ports.announcement_event_publisher import (
    AnnouncementEventPublisher,
)
from src.modules.announcements.domain.entities import Announcement
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.domain.entities import Club
from src.modules.events.application.ports.event_event_publisher import EventEventPublisher
from src.modules.events.domain.entities import Event
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.domain.entities import JoinRequest
from src.modules.members.application.ports.member_event_publisher import (
    MemberEventPublisher,
)
from src.modules.members.domain.entities import Member


def _mock_client() -> MagicMock:
    client = MagicMock(spec=KafkaClient)
    return client


class KafkaPublisherContractTests(unittest.TestCase):
    def test_club_event_publisher_implements_port_and_publishes(self) -> None:
        client = _mock_client()
        publisher = KafkaClubEventPublisher(client)
        publisher.publish_club_created(
            Club(
                id="club-1",
                organization_id="org-1",
                slug="chess-club",
                name="Chess Club",
                description="Strategy and tournaments.",
                status="active",
            )
        )

        self.assertIsInstance(publisher, ClubEventPublisher)
        client.publish.assert_called_once()
        topic, envelope = client.publish.call_args[0]
        self.assertEqual(topic, "clubcrm.clubs.created")
        self.assertEqual(envelope["eventType"], "club_created")
        self.assertEqual(envelope["data"]["clubId"], "club-1")

    def test_form_submission_publisher_implements_port_and_publishes(self) -> None:
        client = _mock_client()
        publisher = KafkaFormSubmissionPublisher(client)
        publisher.publish_join_request_submitted(
            JoinRequest(
                id="join-1",
                organization_id="org-1",
                club_id="club-1",
                submitter_name="Taylor Student",
                submitter_email="taylor@example.edu",
            )
        )

        self.assertIsInstance(publisher, FormSubmissionPublisher)
        client.publish.assert_called_once()
        topic, envelope = client.publish.call_args[0]
        self.assertEqual(topic, "clubcrm.forms.submitted")
        self.assertEqual(envelope["eventType"], "form_submitted")
        self.assertEqual(envelope["data"]["joinRequestId"], "join-1")

    def test_member_event_publisher_implements_port_and_publishes(self) -> None:
        client = _mock_client()
        publisher = KafkaMemberEventPublisher(client)
        publisher.publish_member_added(
            Member(
                id="member-1",
                organization_id="org-1",
                first_name="Taylor",
                last_name="Student",
                email="taylor@example.edu",
            )
        )

        self.assertIsInstance(publisher, MemberEventPublisher)
        client.publish.assert_called_once()
        topic, envelope = client.publish.call_args[0]
        self.assertEqual(topic, "clubcrm.members.added")
        self.assertEqual(envelope["eventType"], "member_added")
        self.assertEqual(envelope["data"]["memberId"], "member-1")

    def test_event_event_publisher_implements_port_and_publishes(self) -> None:
        from datetime import UTC, datetime

        client = _mock_client()
        publisher = KafkaEventEventPublisher(client)
        publisher.publish_event_created(
            Event(
                id="event-1",
                club_id="club-1",
                title="Kickoff",
                description="Opening meeting",
                starts_at=datetime(2026, 4, 10, 18, 0, tzinfo=UTC),
            )
        )

        self.assertIsInstance(publisher, EventEventPublisher)
        client.publish.assert_called_once()
        topic, envelope = client.publish.call_args[0]
        self.assertEqual(topic, "clubcrm.events.created")
        self.assertEqual(envelope["eventType"], "event_created")
        self.assertEqual(envelope["data"]["eventId"], "event-1")

    def test_announcement_event_publisher_implements_port_and_publishes(self) -> None:
        from datetime import UTC, datetime

        client = _mock_client()
        publisher = KafkaAnnouncementEventPublisher(client)
        publisher.publish_announcement_published(
            Announcement(
                id="announcement-1",
                club_id="club-1",
                title="Welcome",
                body="Hello world",
                published_at=datetime(2026, 4, 10, 18, 0, tzinfo=UTC),
            )
        )

        self.assertIsInstance(publisher, AnnouncementEventPublisher)
        client.publish.assert_called_once()
        topic, envelope = client.publish.call_args[0]
        self.assertEqual(topic, "clubcrm.announcements.published")
        self.assertEqual(envelope["eventType"], "announcement_published")
        self.assertEqual(envelope["data"]["announcementId"], "announcement-1")

    def test_kafka_client_publish_no_op_when_not_started(self) -> None:
        client = KafkaClient(bootstrap_servers="kafka:9092")
        self.assertFalse(client.is_ready())
        client.publish("clubcrm.clubs.created", {"hello": "world"})

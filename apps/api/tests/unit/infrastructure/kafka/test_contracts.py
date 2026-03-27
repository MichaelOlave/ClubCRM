import unittest

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.kafka.client import KafkaClient
from src.infrastructure.kafka.publishers.clubs import KafkaClubEventPublisher
from src.infrastructure.kafka.publishers.forms import KafkaFormSubmissionPublisher
from src.modules.clubs.application.ports.club_event_publisher import ClubEventPublisher
from src.modules.clubs.domain.entities import Club
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.domain.entities import JoinRequest


class KafkaAdapterContractTests(unittest.TestCase):
    def test_club_event_publisher_matches_port(self) -> None:
        publisher = KafkaClubEventPublisher(KafkaClient(bootstrap_servers="kafka:9092"))
        publisher.publish_club_created(
            Club(
                id="club-1",
                organization_id="org-1",
                name="Chess Club",
                description="Strategy and tournaments.",
                status="active",
            )
        )

        self.assertIsInstance(publisher, ClubEventPublisher)
        self.assertEqual(publisher.published_events[0]["topic"], "club_created")

    def test_form_submission_publisher_matches_port(self) -> None:
        publisher = KafkaFormSubmissionPublisher(
            KafkaClient(bootstrap_servers="kafka:9092")
        )
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
        self.assertEqual(publisher.published_events[0]["topic"], "form_submitted")

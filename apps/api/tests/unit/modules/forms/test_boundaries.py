import unittest

from helpers import add_api_root_to_path, collect_import_violations

add_api_root_to_path()

from src.modules.forms.application.commands.submit_join_request import SubmitJoinRequest
from src.modules.forms.application.ports.form_submission_publisher import (
    FormSubmissionPublisher,
)
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


class FakeJoinRequestStore(JoinRequestStore):
    def save(self, join_request: JoinRequest) -> JoinRequest:
        return JoinRequest(
            id="join-1",
            organization_id=join_request.organization_id,
            club_id=join_request.club_id,
            submitter_name=join_request.submitter_name,
            submitter_email=join_request.submitter_email,
            payload=join_request.payload,
            status=join_request.status,
        )


class FakeFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self) -> None:
        self.was_called = False

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = join_request
        self.was_called = True


class FormBoundaryTests(unittest.TestCase):
    def test_forms_application_avoids_framework_and_infrastructure_imports(self) -> None:
        violations = collect_import_violations(
            "modules/forms/application", ("fastapi", "src.infrastructure")
        )

        self.assertEqual(violations, [])

    def test_submit_join_request_uses_port_contracts(self) -> None:
        publisher = FakeFormSubmissionPublisher()
        use_case = SubmitJoinRequest(
            store=FakeJoinRequestStore(),
            publisher=publisher,
        )

        result = use_case.execute(
            JoinRequest(
                organization_id="org-1",
                club_id="club-1",
                submitter_name="Taylor Student",
                submitter_email="taylor@example.edu",
            )
        )

        self.assertEqual(result.id, "join-1")
        self.assertTrue(publisher.was_called)

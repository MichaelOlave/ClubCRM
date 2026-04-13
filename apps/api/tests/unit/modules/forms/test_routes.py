import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import add_api_root_to_path

add_api_root_to_path()

from src.bootstrap.dependencies import get_form_submission_publisher, get_join_request_store
from src.modules.forms.application.ports.form_submission_publisher import FormSubmissionPublisher
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest
from src.modules.forms.presentation.http.routes import router


class FakeJoinRequestStore(JoinRequestStore):
    def save(self, join_request: JoinRequest) -> JoinRequest:
        from dataclasses import replace

        return replace(join_request, id="persisted-id-1")

    def list_pending(self, club_id: str) -> list[JoinRequest]:
        return []

    def get(self, join_request_id: str) -> JoinRequest | None:
        return None

    def update_status(self, join_request_id: str, status: str) -> JoinRequest:
        raise NotImplementedError


class FakeFormSubmissionPublisher(FormSubmissionPublisher):
    def __init__(self) -> None:
        self.was_called = False

    def publish_join_request_submitted(self, join_request: JoinRequest) -> None:
        _ = join_request
        self.was_called = True


class JoinRequestRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = FakeJoinRequestStore()
        self.publisher = FakeFormSubmissionPublisher()
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_join_request_store] = lambda: self.store
        self.app.dependency_overrides[get_form_submission_publisher] = lambda: self.publisher
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_valid_submission_returns_201_with_id_and_status(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["id"], "persisted-id-1")
        self.assertEqual(body["status"], "pending")

    def test_valid_submission_calls_publisher(self) -> None:
        self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertTrue(self.publisher.was_called)

    def test_optional_message_included_in_payload(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "message": "I love chess.",
            },
        )

        self.assertEqual(response.status_code, 201)

    def test_optional_form_fields_round_trip_through_response(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
                "student_id": "S12345",
                "role": "Leadership interest",
                "message": "I love chess.",
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["student_id"], "S12345")
        self.assertEqual(body["role"], "Leadership interest")
        self.assertEqual(body["message"], "I love chess.")

    def test_invalid_email_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "not-an-email",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_missing_required_field_returns_422(self) -> None:
        response = self.client.post(
            "/forms/join-request/club-1",
            json={
                "organization_id": "org-1",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_club_id_comes_from_path(self) -> None:
        captured: list[JoinRequest] = []

        class CapturingStore(JoinRequestStore):
            def save(self, join_request: JoinRequest) -> JoinRequest:
                from dataclasses import replace

                captured.append(join_request)
                return replace(join_request, id="captured-id")

            def list_pending(self, club_id: str) -> list[JoinRequest]:
                return []

            def get(self, join_request_id: str) -> JoinRequest | None:
                return None

            def update_status(self, join_request_id: str, status: str) -> JoinRequest:
                raise NotImplementedError

        self.app.dependency_overrides[get_join_request_store] = lambda: CapturingStore()
        self.client.post(
            "/forms/join-request/club-99",
            json={
                "organization_id": "org-1",
                "submitter_name": "Taylor Student",
                "submitter_email": "taylor@example.edu",
            },
        )

        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0].club_id, "club-99")

    def test_list_pending_join_requests_returns_form_fields(self) -> None:
        class PendingStore(JoinRequestStore):
            def save(self, join_request: JoinRequest) -> JoinRequest:
                from dataclasses import replace

                return replace(join_request, id="persisted-id-1")

            def list_pending(self, club_id: str) -> list[JoinRequest]:
                self._requested_club_id = club_id
                return [
                    JoinRequest(
                        id="join-1",
                        organization_id="org-1",
                        club_id=club_id,
                        submitter_name="Taylor Student",
                        submitter_email="taylor@example.edu",
                        payload={
                            "student_id": "S12345",
                            "role": "Leadership interest",
                            "message": "I love chess.",
                        },
                    )
                ]

            def get(self, join_request_id: str) -> JoinRequest | None:
                return None

            def update_status(self, join_request_id: str, status: str) -> JoinRequest:
                raise NotImplementedError

        self.app.dependency_overrides[get_join_request_store] = lambda: PendingStore()

        response = self.client.get("/forms/join-requests/club-1/pending")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["student_id"], "S12345")
        self.assertEqual(body[0]["role"], "Leadership interest")
        self.assertEqual(body[0]["message"], "I love chess.")

import unittest
from unittest.mock import MagicMock, patch

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.mongodb.client import MongoDBClient  # noqa: E402
from src.infrastructure.mongodb.stores.forms import MongoDBJoinRequestStore  # noqa: E402
from src.modules.forms.application.ports.join_request_store import JoinRequestStore  # noqa: E402
from src.modules.forms.domain.entities import JoinRequest  # noqa: E402


def _make_store() -> MongoDBJoinRequestStore:
    return MongoDBJoinRequestStore(MongoDBClient(database_url="mongodb://example"))


def _sample_join_request() -> JoinRequest:
    return JoinRequest(
        organization_id="org-1",
        club_id="club-1",
        submitter_name="Taylor Student",
        submitter_email="taylor@example.edu",
    )


class MongoDBAdapterContractTests(unittest.TestCase):
    def test_join_request_store_implements_port(self) -> None:
        self.assertIsInstance(_make_store(), JoinRequestStore)

    def test_save_returns_join_request_with_id(self) -> None:
        fake_result = MagicMock()
        fake_result.inserted_id = "507f1f77bcf86cd799439011"

        with patch("pymongo.MongoClient") as mock_client_cls:
            mock_client_cls.return_value.get_database.return_value.__getitem__.return_value.insert_one.return_value = fake_result
            result = _make_store().save(_sample_join_request())

        self.assertEqual(result.id, "507f1f77bcf86cd799439011")
        self.assertEqual(result.status, "pending")

    def test_save_preserves_submitter_fields(self) -> None:
        fake_result = MagicMock()
        fake_result.inserted_id = "abc123"

        with patch("pymongo.MongoClient") as mock_client_cls:
            mock_client_cls.return_value.get_database.return_value.__getitem__.return_value.insert_one.return_value = fake_result
            result = _make_store().save(_sample_join_request())

        self.assertEqual(result.submitter_name, "Taylor Student")
        self.assertEqual(result.submitter_email, "taylor@example.edu")
        self.assertEqual(result.club_id, "club-1")
        self.assertEqual(result.organization_id, "org-1")

    def test_save_writes_correct_document_shape(self) -> None:
        fake_result = MagicMock()
        fake_result.inserted_id = "abc123"

        with patch("pymongo.MongoClient") as mock_client_cls:
            mock_collection = (
                mock_client_cls.return_value.get_database.return_value.__getitem__.return_value
            )
            mock_collection.insert_one.return_value = fake_result
            _make_store().save(_sample_join_request())

        inserted_doc = mock_collection.insert_one.call_args[0][0]
        self.assertEqual(inserted_doc["organizationId"], "org-1")
        self.assertEqual(inserted_doc["clubId"], "club-1")
        self.assertEqual(inserted_doc["formType"], "join_request")
        self.assertEqual(inserted_doc["submitter"]["name"], "Taylor Student")
        self.assertEqual(inserted_doc["submitter"]["email"], "taylor@example.edu")
        self.assertEqual(inserted_doc["status"], "pending")
        self.assertIn("submittedAt", inserted_doc)

import unittest

from helpers import add_api_root_to_path

add_api_root_to_path()

from src.infrastructure.mongodb.client import MongoDBClient
from src.infrastructure.mongodb.stores.forms import MongoDBJoinRequestStore
from src.modules.forms.application.ports.join_request_store import JoinRequestStore
from src.modules.forms.domain.entities import JoinRequest


class MongoDBAdapterContractTests(unittest.TestCase):
    def test_join_request_store_matches_port(self) -> None:
        store = MongoDBJoinRequestStore(MongoDBClient(database_url="mongodb://example"))
        result = store.save(
            JoinRequest(
                organization_id="org-1",
                club_id="club-1",
                submitter_name="Taylor Student",
                submitter_email="taylor@example.edu",
            )
        )

        self.assertIsInstance(store, JoinRequestStore)
        self.assertIsNotNone(result.id)

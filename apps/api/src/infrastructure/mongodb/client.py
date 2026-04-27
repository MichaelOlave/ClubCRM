from dataclasses import dataclass

import pymongo
import pymongo.database


@dataclass(frozen=True)
class MongoDBClient:
    database_url: str
    database_name: str = "clubcrm"
    server_selection_timeout_ms: int = 2000

    def _build_client(self) -> pymongo.MongoClient:
        return pymongo.MongoClient(
            self.database_url,
            serverSelectionTimeoutMS=self.server_selection_timeout_ms,
        )

    def get_database(self) -> pymongo.database.Database:
        return self._build_client().get_database(self.database_name)

    def ping(self) -> dict:
        client = self._build_client()
        try:
            return client.admin.command("ping")
        finally:
            client.close()

from dataclasses import dataclass

import pymongo
import pymongo.database


@dataclass(frozen=True)
class MongoDBClient:
    database_url: str

    def get_database(self) -> pymongo.database.Database:
        return pymongo.MongoClient(self.database_url).get_database("clubcrm")

from dataclasses import dataclass


@dataclass(frozen=True)
class MongoDBClient:
    database_url: str

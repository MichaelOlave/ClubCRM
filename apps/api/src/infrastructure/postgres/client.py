from dataclasses import dataclass


@dataclass(frozen=True)
class PostgresClient:
    dsn: str

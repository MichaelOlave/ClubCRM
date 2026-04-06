from dataclasses import dataclass, field

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session


@dataclass
class PostgresClient:
    dsn: str
    _engine: Engine | None = field(default=None, init=False, repr=False)

    def get_engine(self) -> Engine:
        if self._engine is None:
            driver_ready_dsn = self.dsn.replace("postgresql://", "postgresql+psycopg://", 1)
            self._engine = create_engine(driver_ready_dsn, future=True)

        return self._engine

    def create_session(self) -> Session:
        return Session(self.get_engine())

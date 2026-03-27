from dataclasses import dataclass


@dataclass(frozen=True)
class RedisClient:
    url: str

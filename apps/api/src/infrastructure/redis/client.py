# from dataclasses import dataclass


# @dataclass(frozen=True)
# class RedisClient:
#     url: str

from dataclasses import dataclass
import json
from typing import Any

import redis


@dataclass(frozen=True)
class RedisClient:
    url: str

    def _connection(self) -> redis.Redis:
        return redis.Redis.from_url(self.url, decode_responses=True)

    def ping(self) -> bool:
        return bool(self._connection().ping())

    def info(self) -> dict[str, Any]:
        return self._connection().info()

    def get_json(self, key: str) -> Any | None:
        raw = self._connection().get(key)
        if raw is None:
            return None
        return json.loads(raw)

    def set_json(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value)
        if ttl_seconds is None:
            self._connection().set(key, payload)
        else:
            self._connection().setex(key, ttl_seconds, payload)

    def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        return int(self._connection().delete(*keys))

    def ttl(self, key: str) -> int:
        return int(self._connection().ttl(key))
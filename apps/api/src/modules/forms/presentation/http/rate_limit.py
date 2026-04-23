from dataclasses import dataclass

from fastapi import HTTPException, Request, status

from src.infrastructure.redis.client import RedisClient

RATE_LIMIT_PREFIX = "rate-limit:forms:join-request"


def _get_request_subject(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if isinstance(forwarded_for, str) and forwarded_for.strip():
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    client = request.client
    if client is not None and client.host:
        return client.host

    return "unknown"


@dataclass(frozen=True)
class PublicJoinRequestRateLimiter:
    client: RedisClient
    max_requests: int
    window_seconds: int

    def enforce(self, request: Request, club_id: str) -> None:
        if self.max_requests <= 0 or self.window_seconds <= 0:
            return

        key = f"{RATE_LIMIT_PREFIX}:{club_id}:{_get_request_subject(request)}"

        try:
            request_count = self.client.increment(key)
            if request_count == 1 or self.client.ttl(key) < 0:
                self.client.expire(key, self.window_seconds)

            if request_count <= self.max_requests:
                return

            retry_after_seconds = self.client.ttl(key)
        except Exception:
            return

        retry_after = retry_after_seconds if retry_after_seconds > 0 else self.window_seconds
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many join requests from this source. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )

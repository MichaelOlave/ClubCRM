from dataclasses import dataclass


@dataclass(frozen=True)
class CurrentUser:
    sub: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    email_verified: bool = False

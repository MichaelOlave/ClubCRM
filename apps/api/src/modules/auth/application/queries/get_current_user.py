from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from src.modules.auth.domain.entities import CurrentUser


@dataclass(frozen=True)
class GetCurrentUser:
    def execute(self, session_payload: Mapping[str, Any]) -> CurrentUser:
        subject = session_payload.get("sub")
        if not isinstance(subject, str) or not subject:
            raise ValueError("The current session does not include a valid user subject.")

        email = session_payload.get("email")
        name = session_payload.get("name")
        picture = session_payload.get("picture")

        return CurrentUser(
            sub=subject,
            email=email if isinstance(email, str) and email else None,
            name=name if isinstance(name, str) and name else None,
            picture=picture if isinstance(picture, str) and picture else None,
            email_verified=bool(session_payload.get("email_verified", False)),
        )

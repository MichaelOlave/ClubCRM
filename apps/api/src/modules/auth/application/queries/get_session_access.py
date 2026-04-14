from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from src.modules.auth.domain.entities import AppAccess


@dataclass(frozen=True)
class GetSessionAccess:
    def execute(self, session_payload: Mapping[str, Any]) -> AppAccess:
        primary_role = session_payload.get("primary_role")
        if primary_role not in {"org_admin", "club_manager"}:
            raise ValueError("The current session does not include a valid primary role.")

        organization_id = session_payload.get("organization_id")
        if not isinstance(organization_id, str) or not organization_id:
            raise ValueError("The current session does not include an organization identifier.")

        raw_managed_club_ids = session_payload.get("managed_club_ids", [])
        if not isinstance(raw_managed_club_ids, list):
            raise ValueError("The current session managed club list is invalid.")

        managed_club_ids = tuple(
            club_id for club_id in raw_managed_club_ids if isinstance(club_id, str) and club_id
        )

        return AppAccess(
            primary_role=primary_role,
            organization_id=organization_id,
            managed_club_ids=managed_club_ids,
        )

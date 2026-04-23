from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class DashboardSummaryQuery:
    club_id: str


@dataclass(frozen=True)
class DashboardOverviewQuery:
    organization_id: str
    primary_role: Literal["org_admin", "club_manager"]
    club_ids: tuple[str, ...]

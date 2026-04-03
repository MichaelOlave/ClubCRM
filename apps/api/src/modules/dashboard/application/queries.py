from dataclasses import dataclass


@dataclass(frozen=True)
class DashboardSummaryQuery:
    club_id: str

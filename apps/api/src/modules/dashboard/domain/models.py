from dataclasses import dataclass


@dataclass(frozen=True)
class DashboardSummary:
    club_id: str
    total_members: int
    total_events: int
    total_announcements: int

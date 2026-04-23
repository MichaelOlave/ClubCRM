from dataclasses import dataclass


@dataclass(frozen=True)
class DashboardSummary:
    club_id: str
    total_members: int
    total_events: int
    total_announcements: int


@dataclass(frozen=True)
class DashboardRedisAnalytics:
    club_id: str
    cache_key: str
    available: bool
    cache_present: bool
    ttl_seconds: int | None
    request_count: int
    hit_count: int
    miss_count: int
    refresh_count: int
    invalidation_count: int
    hit_rate: float
    status: str
    error: str | None = None


@dataclass(frozen=True)
class DashboardOverviewScope:
    organization_id: str
    primary_role: str
    club_ids: tuple[str, ...]


@dataclass(frozen=True)
class DashboardOverviewMetrics:
    accessible_club_count: int
    active_club_count: int
    unique_member_count: int
    pending_membership_count: int
    upcoming_event_count: int
    announcement_count: int
    multi_club_member_count: int


@dataclass(frozen=True)
class DashboardOverviewClubSummary:
    id: str
    organization_id: str
    slug: str
    name: str
    description: str
    status: str
    member_count: int
    manager_name: str | None
    next_event_at: str | None


@dataclass(frozen=True)
class DashboardOverviewActivity:
    id: str
    club_id: str
    club_slug: str
    club_name: str
    type: str
    title: str
    description: str
    timestamp: str


@dataclass(frozen=True)
class DashboardOverview:
    scope: DashboardOverviewScope
    metrics: DashboardOverviewMetrics
    clubs: tuple[DashboardOverviewClubSummary, ...]
    recent_activity: tuple[DashboardOverviewActivity, ...]

    @classmethod
    def from_dict(cls, data: dict[str, object]) -> "DashboardOverview":
        scope = data.get("scope")
        metrics = data.get("metrics")
        clubs = data.get("clubs")
        recent_activity = data.get("recent_activity")

        if not isinstance(scope, dict) or not isinstance(metrics, dict):
            raise ValueError("Dashboard overview payload is invalid.")

        return cls(
            scope=DashboardOverviewScope(
                organization_id=str(scope["organization_id"]),
                primary_role=str(scope["primary_role"]),
                club_ids=tuple(str(club_id) for club_id in scope.get("club_ids", [])),
            ),
            metrics=DashboardOverviewMetrics(
                accessible_club_count=int(metrics["accessible_club_count"]),
                active_club_count=int(metrics["active_club_count"]),
                unique_member_count=int(metrics["unique_member_count"]),
                pending_membership_count=int(metrics["pending_membership_count"]),
                upcoming_event_count=int(metrics["upcoming_event_count"]),
                announcement_count=int(metrics["announcement_count"]),
                multi_club_member_count=int(metrics["multi_club_member_count"]),
            ),
            clubs=tuple(
                DashboardOverviewClubSummary(
                    id=str(club["id"]),
                    organization_id=str(club["organization_id"]),
                    slug=str(club["slug"]),
                    name=str(club["name"]),
                    description=str(club["description"]),
                    status=str(club["status"]),
                    member_count=int(club["member_count"]),
                    manager_name=str(club["manager_name"])
                    if club.get("manager_name") is not None
                    else None,
                    next_event_at=str(club["next_event_at"])
                    if club.get("next_event_at") is not None
                    else None,
                )
                for club in (clubs if isinstance(clubs, list) else [])
                if isinstance(club, dict)
            ),
            recent_activity=tuple(
                DashboardOverviewActivity(
                    id=str(activity["id"]),
                    club_id=str(activity["club_id"]),
                    club_slug=str(activity["club_slug"]),
                    club_name=str(activity["club_name"]),
                    type=str(activity["type"]),
                    title=str(activity["title"]),
                    description=str(activity["description"]),
                    timestamp=str(activity["timestamp"]),
                )
                for activity in (recent_activity if isinstance(recent_activity, list) else [])
                if isinstance(activity, dict)
            ),
        )

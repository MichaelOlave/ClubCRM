from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import case, distinct, func, literal, select

from src.infrastructure.postgres.client import PostgresClient
from src.infrastructure.postgres.models.tables import (
    AnnouncementModel,
    ClubManagerRoleModel,
    ClubModel,
    EventModel,
    MemberModel,
    MembershipModel,
)
from src.modules.dashboard.application.ports.dashboard_repository import DashboardRepository
from src.modules.dashboard.domain.models import (
    DashboardOverview,
    DashboardOverviewActivity,
    DashboardOverviewClubSummary,
    DashboardOverviewMetrics,
    DashboardOverviewScope,
    DashboardSummary,
)


class PostgresDashboardRepository(DashboardRepository):
    def __init__(self, client: PostgresClient) -> None:
        self.client = client

    def get_summary(self, club_id: str) -> DashboardSummary | None:
        with self.client.create_session() as session:
            club_exists = session.scalar(select(ClubModel.id).where(ClubModel.id == club_id))
            if club_exists is None:
                return None

            total_members = session.scalar(
                select(func.count(MembershipModel.id)).where(MembershipModel.club_id == club_id)
            )
            total_events = session.scalar(
                select(func.count(EventModel.id)).where(EventModel.club_id == club_id)
            )
            total_announcements = session.scalar(
                select(func.count(AnnouncementModel.id)).where(AnnouncementModel.club_id == club_id)
            )

            return DashboardSummary(
                club_id=club_id,
                total_members=int(total_members or 0),
                total_events=int(total_events or 0),
                total_announcements=int(total_announcements or 0),
            )

    def get_overview(
        self,
        *,
        organization_id: str,
        primary_role: Literal["org_admin", "club_manager"],
        club_ids: tuple[str, ...],
    ) -> DashboardOverview:
        scope_club_ids = tuple(sorted(club_ids)) if primary_role == "club_manager" else ()
        with self.client.create_session() as session:
            clubs = self._list_accessible_clubs(
                session,
                organization_id=organization_id,
                primary_role=primary_role,
                club_ids=scope_club_ids,
            )
            accessible_club_ids = tuple(club.id for club in clubs)

            if not accessible_club_ids:
                return DashboardOverview(
                    scope=DashboardOverviewScope(
                        organization_id=organization_id,
                        primary_role=primary_role,
                        club_ids=scope_club_ids,
                    ),
                    metrics=DashboardOverviewMetrics(
                        accessible_club_count=0,
                        active_club_count=0,
                        unique_member_count=0,
                        pending_membership_count=0,
                        upcoming_event_count=0,
                        announcement_count=0,
                        multi_club_member_count=0,
                    ),
                    clubs=(),
                    recent_activity=(),
                )

            (
                member_counts,
                pending_membership_count,
                unique_member_count,
                multi_club_member_count,
            ) = self._get_membership_metrics(session, accessible_club_ids)
            event_counts, upcoming_event_count, next_event_at = self._get_event_metrics(
                session, accessible_club_ids
            )
            announcement_counts, announcement_count = self._get_announcement_metrics(
                session, accessible_club_ids
            )
            manager_names = self._get_manager_names(session, accessible_club_ids)
            recent_activity = self._get_recent_activity(session, accessible_club_ids)

            return DashboardOverview(
                scope=DashboardOverviewScope(
                    organization_id=organization_id,
                    primary_role=primary_role,
                    club_ids=scope_club_ids,
                ),
                metrics=DashboardOverviewMetrics(
                    accessible_club_count=len(clubs),
                    active_club_count=sum(1 for club in clubs if club.status == "active"),
                    unique_member_count=unique_member_count,
                    pending_membership_count=pending_membership_count,
                    upcoming_event_count=upcoming_event_count,
                    announcement_count=announcement_count,
                    multi_club_member_count=multi_club_member_count,
                ),
                clubs=tuple(
                    DashboardOverviewClubSummary(
                        id=club.id,
                        organization_id=club.organization_id,
                        slug=club.slug,
                        name=club.name,
                        description=club.description,
                        status=club.status,
                        member_count=member_counts.get(club.id, 0),
                        manager_name=manager_names.get(club.id),
                        next_event_at=next_event_at.get(club.id),
                    )
                    for club in clubs
                ),
                recent_activity=recent_activity,
            )

    def _list_accessible_clubs(
        self,
        session,
        *,
        organization_id: str,
        primary_role: Literal["org_admin", "club_manager"],
        club_ids: tuple[str, ...],
    ) -> list[ClubModel]:
        statement = select(ClubModel).where(ClubModel.organization_id == organization_id)
        if primary_role == "club_manager":
            if not club_ids:
                return []
            statement = statement.where(ClubModel.id.in_(club_ids))

        return list(session.execute(statement.order_by(ClubModel.name, ClubModel.slug)).scalars())

    def _get_membership_metrics(
        self,
        session,
        club_ids: tuple[str, ...],
    ) -> tuple[dict[str, int], int, int, int]:
        member_counts_by_club = {
            club_id: int(total_members)
            for club_id, total_members in session.execute(
                select(
                    MembershipModel.club_id,
                    func.count(MembershipModel.id),
                )
                .where(MembershipModel.club_id.in_(club_ids))
                .group_by(MembershipModel.club_id)
            ).all()
        }
        pending_membership_count = int(
            session.scalar(
                select(func.count(MembershipModel.id)).where(
                    MembershipModel.club_id.in_(club_ids),
                    MembershipModel.status == "pending",
                )
            )
            or 0
        )
        membership_rows = session.execute(
            select(
                MembershipModel.member_id,
                func.count(distinct(MembershipModel.club_id)).label("club_count"),
            )
            .where(MembershipModel.club_id.in_(club_ids))
            .group_by(MembershipModel.member_id)
        ).all()
        unique_member_count = len(membership_rows)
        multi_club_member_count = sum(1 for _, club_count in membership_rows if int(club_count) > 1)

        return (
            member_counts_by_club,
            pending_membership_count,
            unique_member_count,
            multi_club_member_count,
        )

    def _get_event_metrics(
        self,
        session,
        club_ids: tuple[str, ...],
    ) -> tuple[dict[str, int], int, dict[str, str | None]]:
        now = datetime.now(UTC)
        rows = session.execute(
            select(
                EventModel.club_id,
                func.count(EventModel.id),
                func.sum(case((EventModel.starts_at >= now, 1), else_=0)),
                func.min(case((EventModel.starts_at >= now, EventModel.starts_at), else_=None)),
            )
            .where(EventModel.club_id.in_(club_ids))
            .group_by(EventModel.club_id)
        ).all()

        event_counts_by_club: dict[str, int] = {}
        next_event_at_by_club: dict[str, str | None] = {}
        upcoming_event_count = 0

        for club_id, total_events, upcoming_events, next_event_at in rows:
            event_counts_by_club[str(club_id)] = int(total_events or 0)
            upcoming_event_count += int(upcoming_events or 0)
            next_event_at_by_club[str(club_id)] = (
                next_event_at.astimezone(UTC).isoformat()
                if isinstance(next_event_at, datetime)
                else None
            )

        return event_counts_by_club, upcoming_event_count, next_event_at_by_club

    def _get_announcement_metrics(
        self,
        session,
        club_ids: tuple[str, ...],
    ) -> tuple[dict[str, int], int]:
        rows = session.execute(
            select(
                AnnouncementModel.club_id,
                func.count(AnnouncementModel.id),
            )
            .where(AnnouncementModel.club_id.in_(club_ids))
            .group_by(AnnouncementModel.club_id)
        ).all()
        announcement_counts_by_club = {
            str(club_id): int(total_announcements or 0) for club_id, total_announcements in rows
        }
        announcement_count = sum(announcement_counts_by_club.values())

        return announcement_counts_by_club, announcement_count

    def _get_manager_names(self, session, club_ids: tuple[str, ...]) -> dict[str, str]:
        rows = session.execute(
            select(
                ClubManagerRoleModel.club_id,
                MemberModel.first_name,
                MemberModel.last_name,
                MemberModel.email,
            )
            .join(MemberModel, MemberModel.id == ClubManagerRoleModel.member_id)
            .where(ClubManagerRoleModel.club_id.in_(club_ids))
            .order_by(
                ClubManagerRoleModel.club_id,
                MemberModel.last_name,
                MemberModel.first_name,
                MemberModel.email,
            )
        ).all()

        manager_names: dict[str, str] = {}
        for club_id, first_name, last_name, email in rows:
            normalized_club_id = str(club_id)
            if normalized_club_id in manager_names:
                continue

            name = " ".join(
                token for token in (str(first_name).strip(), str(last_name).strip()) if token
            ).strip()
            manager_names[normalized_club_id] = name or (str(email) if email is not None else "")

        return {club_id: name for club_id, name in manager_names.items() if name}

    def _get_recent_activity(
        self,
        session,
        club_ids: tuple[str, ...],
    ) -> tuple[DashboardOverviewActivity, ...]:
        event_activity = (
            select(
                EventModel.id.label("id"),
                EventModel.club_id.label("club_id"),
                ClubModel.slug.label("club_slug"),
                ClubModel.name.label("club_name"),
                literal("event").label("type"),
                EventModel.title.label("title"),
                EventModel.description.label("body"),
                EventModel.location.label("location"),
                EventModel.starts_at.label("timestamp"),
            )
            .join(ClubModel, ClubModel.id == EventModel.club_id)
            .where(EventModel.club_id.in_(club_ids))
        )
        announcement_activity = (
            select(
                AnnouncementModel.id.label("id"),
                AnnouncementModel.club_id.label("club_id"),
                ClubModel.slug.label("club_slug"),
                ClubModel.name.label("club_name"),
                literal("announcement").label("type"),
                AnnouncementModel.title.label("title"),
                AnnouncementModel.body.label("body"),
                literal(None).label("location"),
                AnnouncementModel.published_at.label("timestamp"),
            )
            .join(ClubModel, ClubModel.id == AnnouncementModel.club_id)
            .where(AnnouncementModel.club_id.in_(club_ids))
        )
        activity = event_activity.union_all(announcement_activity).subquery()
        rows = session.execute(
            select(activity).order_by(activity.c.timestamp.desc()).limit(5)
        ).all()

        return tuple(
            DashboardOverviewActivity(
                id=str(row.id),
                club_id=str(row.club_id),
                club_slug=str(row.club_slug),
                club_name=str(row.club_name),
                type=str(row.type),
                title=str(row.title),
                description=self._build_activity_description(
                    activity_type=str(row.type),
                    body=str(row.body or ""),
                    location=str(row.location) if row.location is not None else None,
                ),
                timestamp=row.timestamp.astimezone(UTC).isoformat()
                if isinstance(row.timestamp, datetime)
                else "",
            )
            for row in rows
        )

    def _build_activity_description(
        self,
        *,
        activity_type: str,
        body: str,
        location: str | None,
    ) -> str:
        if activity_type == "event" and location:
            return location

        return self._create_excerpt(body)

    def _create_excerpt(self, value: str) -> str:
        normalized_value = " ".join(value.split()).strip()
        if len(normalized_value) <= 120:
            return normalized_value

        return f"{normalized_value[:117]}..."

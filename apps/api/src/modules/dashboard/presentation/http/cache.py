from src.modules.dashboard.application.ports.dashboard_summary_cache import (
    DashboardSummaryCache,
)


def invalidate_dashboard_cache(
    cache: DashboardSummaryCache | None,
    *club_ids: str | None,
) -> None:
    if cache is None:
        return

    for club_id in {value for value in club_ids if value}:
        try:
            cache.delete(club_id)
        except Exception:
            continue

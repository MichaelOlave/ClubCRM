import { getDashboardOverviewApi } from "@/lib/api/clubcrm";
import { isOrgAdminBackendAuthSession } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import type { DashboardViewModel } from "@/features/dashboard/types";

export async function getDashboardViewModel(
  session: AuthorizedBackendAuthSession
): Promise<DashboardViewModel> {
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const overview = await getDashboardOverviewApi();
  const { metrics } = overview;
  const joinPreviewHref = overview.clubs[0] ? `/join/${overview.clubs[0].slug}` : "/clubs";

  return {
    metrics: [
      {
        label: isOrgAdmin ? "Active clubs" : "Managed clubs",
        value: `${isOrgAdmin ? metrics.active_club_count : metrics.accessible_club_count}`,
        detail: isOrgAdmin
          ? "Club records loaded from the connected PostgreSQL-backed API."
          : "Only clubs assigned through club-manager grants appear in this workspace.",
        tone: metrics.accessible_club_count ? "success" : "warning",
      },
      {
        label: isOrgAdmin ? "Organization members" : "Roster members",
        value: `${metrics.unique_member_count}`,
        detail: isOrgAdmin
          ? `${metrics.multi_club_member_count} members currently belong to more than one club.`
          : `${metrics.pending_membership_count} pending roster assignments currently need review across your clubs.`,
        tone: "default",
      },
      {
        label: "Upcoming events",
        value: `${metrics.upcoming_event_count}`,
        detail: "Scheduled events aggregated from the shared dashboard overview endpoint.",
        tone: metrics.upcoming_event_count ? "success" : "warning",
      },
      {
        label: "Announcements",
        value: `${metrics.announcement_count}`,
        detail:
          "Club announcements and scheduled posts aggregated from the shared dashboard overview endpoint.",
        tone: metrics.announcement_count ? "success" : "warning",
      },
    ],
    joinPreviewHref,
    activity: overview.recent_activity.map((activity) => ({
      id: `${activity.type}-${activity.id}`,
      title:
        activity.type === "event"
          ? `${activity.club_name} scheduled ${activity.title}`
          : `${activity.club_name}: ${activity.title}`,
      description: activity.description,
      timestamp: activity.timestamp,
      type: activity.type,
      href: `/clubs/${activity.club_slug}`,
    })),
  };
}

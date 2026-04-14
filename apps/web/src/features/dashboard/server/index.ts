import {
  getDashboardRedisAnalyticsApi,
  getDashboardSummaryApi,
  listAnnouncementsApi,
  listEventsApi,
  listMembershipsApi,
} from "@/lib/api/clubcrm";
import { isOrgAdminBackendAuthSession } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import { getClubList } from "@/features/clubs/server";
import { getMemberList } from "@/features/members/server";
import type { DashboardViewModel } from "@/features/dashboard/types";
import type {
  BackendDashboardRedisAnalyticsRecord,
  BackendDashboardSummaryRecord,
} from "@/types/api";

function createExcerpt(value: string): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= 120) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 117)}...`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTtl(ttlSeconds: number | null): string {
  if (ttlSeconds === null) {
    return "Not cached yet";
  }

  if (ttlSeconds < 60) {
    return `${ttlSeconds}s remaining`;
  }

  return `${Math.ceil(ttlSeconds / 60)}m remaining`;
}

type DashboardSnapshot = {
  club: Awaited<ReturnType<typeof getClubList>>[number];
  redisAnalytics: BackendDashboardRedisAnalyticsRecord;
  summary: BackendDashboardSummaryRecord;
};

export async function getDashboardViewModel(
  session: AuthorizedBackendAuthSession
): Promise<DashboardViewModel> {
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const [clubs, members] = await Promise.all([
    getClubList(session),
    isOrgAdmin ? getMemberList() : Promise.resolve([]),
  ]);
  const membershipLists = await Promise.all(
    clubs.map((club) => listMembershipsApi({ clubId: club.id }))
  );
  const clubActivity = await Promise.all(
    clubs.map(async (club) => {
      const [events, announcements] = await Promise.all([
        listEventsApi(club.id),
        listAnnouncementsApi(club.id),
      ]);

      return { announcements, club, events };
    })
  );
  const dashboardSnapshots: DashboardSnapshot[] = await Promise.all(
    clubs.map(async (club) => {
      const [summary, redisAnalytics] = await Promise.all([
        getDashboardSummaryApi(club.id),
        getDashboardRedisAnalyticsApi(club.id),
      ]);

      return { club, redisAnalytics, summary };
    })
  );
  const uniqueMemberIds = new Set(membershipLists.flat().map((membership) => membership.member_id));
  const pendingRosterCount = membershipLists
    .flat()
    .filter((membership) => membership.status === "pending").length;

  const upcomingEventCount = clubActivity.reduce(
    (count, entry) =>
      count +
      entry.events.filter(
        (event) => event.starts_at && new Date(event.starts_at).getTime() >= Date.now()
      ).length,
    0
  );
  const joinPreviewHref = clubs[0] ? `/join/${clubs[0].id}` : "/clubs";
  const totalRequests = dashboardSnapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.request_count,
    0
  );
  const totalHits = dashboardSnapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.hit_count,
    0
  );
  const totalRefreshes = dashboardSnapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.refresh_count,
    0
  );
  const totalInvalidations = dashboardSnapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.invalidation_count,
    0
  );
  const warmClubCount = dashboardSnapshots.filter((entry) => entry.redisAnalytics.cache_present)
    .length;
  const aggregateHitRate = totalRequests ? totalHits / totalRequests : 0;
  const warmClubLabel = clubs.length ? `${warmClubCount}/${clubs.length}` : "0/0";
  const clubSummaries = dashboardSnapshots
    .map(({ club, redisAnalytics, summary }) => ({
      clubId: club.id,
      clubName: club.name,
      totalMembers: summary.total_members,
      totalEvents: summary.total_events,
      totalAnnouncements: summary.total_announcements,
      cacheStatus: redisAnalytics.status,
      cacheDetail: redisAnalytics.error ?? formatTtl(redisAnalytics.ttl_seconds),
      hitRate: formatPercent(redisAnalytics.hit_rate),
      requestCount: `${redisAnalytics.request_count} requests`,
    }))
    .sort((left, right) => left.clubName.localeCompare(right.clubName));
  const warmTtlSeconds =
    dashboardSnapshots
      .map((entry) => entry.redisAnalytics.ttl_seconds)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => right - left)[0] ?? null;

  return {
    metrics: [
      {
        label: isOrgAdmin ? "Active clubs" : "Managed clubs",
        value: `${clubs.filter((club) => club.status === "active").length}`,
        detail: isOrgAdmin
          ? "Club records loaded from the connected PostgreSQL-backed API."
          : "Only clubs assigned through club-manager grants appear in this workspace.",
        tone: clubs.length ? "success" : "warning",
      },
      {
        label: isOrgAdmin ? "Organization members" : "Roster members",
        value: `${isOrgAdmin ? members.length : uniqueMemberIds.size}`,
        detail: isOrgAdmin
          ? `${members.filter((member) => member.clubCount > 1).length} members currently belong to more than one club.`
          : `${pendingRosterCount} pending roster assignments currently need review across your clubs.`,
        tone: "default",
      },
      {
        label: "Upcoming events",
        value: `${upcomingEventCount}`,
        detail: "Scheduled events aggregated from the club activity endpoints.",
        tone: upcomingEventCount ? "success" : "warning",
      },
    ],
    quickActions: [
      {
        label: "Browse clubs",
        href: "/clubs",
        id: "browse-clubs",
        description: "Review the live club directory and detail pages.",
      },
      ...(isOrgAdmin
        ? [
            {
              label: "Browse members",
              href: "/members",
              id: "browse-members",
              description: "Inspect organization-level members and their memberships.",
            },
          ]
        : []),
      {
        label: clubs[0] ? "Preview join form" : "Open clubs",
        href: joinPreviewHref,
        id: "join-preview",
        description: clubs[0]
          ? "Open the public join route for the first club returned by the API."
          : "Create or seed a club record before testing the public join route.",
      },
    ],
    redisViews: {
      admin: {
        title: "Admin Redis analytics",
        description:
          "Operational cache telemetry for the Redis-backed dashboard summaries, including warmth, hit rate, and invalidation activity.",
        metrics: [
          {
            label: "Warm club caches",
            value: warmClubLabel,
            detail:
              "Club dashboard summaries currently served from Redis instead of requiring a full rebuild.",
            tone: warmClubCount ? "success" : "warning",
          },
          {
            label: "Cache hit rate",
            value: formatPercent(aggregateHitRate),
            detail:
              `${totalHits} cache hits across ${totalRequests} summary requests observed through the dashboard cache adapter.`,
            tone: totalHits ? "success" : "warning",
          },
          {
            label: "Refresh vs invalidation",
            value: `${totalRefreshes}/${totalInvalidations}`,
            detail:
              "Refreshes count summary repopulations after misses; invalidations track writes that intentionally clear stale club summaries.",
            tone: "default",
          },
        ],
        clubSummaries,
      },
      user: {
        title: "Member-facing Redis view",
        description:
          "A simpler view of what the cache means for people browsing the product: warm summaries, quick rebuilds, and short freshness windows.",
        metrics: [
          {
            label: "Ready club summaries",
            value: `${warmClubCount}`,
            detail: "These club overviews are already staged in Redis for the next dashboard read.",
            tone: warmClubCount ? "success" : "warning",
          },
          {
            label: "Freshness window",
            value: warmTtlSeconds === null ? "Cold cache" : formatTtl(warmTtlSeconds),
            detail:
              "Dashboard summaries expire quickly on purpose so Redis stays a speed layer instead of becoming the system of record.",
            tone: warmTtlSeconds === null ? "warning" : "default",
          },
          {
            label: "Safe fallback path",
            value: "Postgres-backed",
            detail:
              "If Redis is cold or unavailable, the dashboard still rebuilds its club summary from canonical relational data.",
            tone: "default",
          },
        ],
        clubSummaries,
      },
    },
    activity: clubActivity
      .flatMap((entry) => [
        ...entry.events
          .filter((event) => Boolean(event.starts_at))
          .map((event) => ({
            id: `event-${event.id}`,
            title: `${entry.club.name} scheduled ${event.title}`,
            description: event.location ?? createExcerpt(event.description),
            timestamp: event.starts_at ?? "",
            type: "event" as const,
          })),
        ...entry.announcements.map((announcement) => ({
          id: `announcement-${announcement.id}`,
          title: `${entry.club.name}: ${announcement.title}`,
          description: createExcerpt(announcement.body),
          timestamp: announcement.published_at,
          type: "announcement" as const,
        })),
      ])
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 5),
  };
}

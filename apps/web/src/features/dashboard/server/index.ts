import { listAnnouncementsApi, listEventsApi, listMembershipsApi } from "@/lib/api/clubcrm";
import { isOrgAdminBackendAuthSession } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import { getClubList } from "@/features/clubs/server";
import { getMemberList } from "@/features/members/server";
import type { DashboardViewModel } from "@/features/dashboard/types";

function createExcerpt(value: string): string {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= 120) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 117)}...`;
}

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
  const uniqueMemberIds = new Set(membershipLists.flat().map((membership) => membership.member_id));
  const pendingRosterCount = membershipLists
    .flat()
    .filter((membership) => membership.status === "pending").length;
  const announcementCount = clubActivity.reduce(
    (count, entry) => count + entry.announcements.length,
    0
  );

  const upcomingEventCount = clubActivity.reduce(
    (count, entry) =>
      count +
      entry.events.filter(
        (event) => event.starts_at && new Date(event.starts_at).getTime() >= Date.now()
      ).length,
    0
  );
  const joinPreviewHref = clubs[0] ? `/join/${clubs[0].slug}` : "/clubs";

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
      {
        label: "Announcements",
        value: `${announcementCount}`,
        detail: "Club announcements and scheduled posts aggregated from the live API.",
        tone: announcementCount ? "success" : "warning",
      },
    ],
    joinPreviewHref,
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
            href: `/clubs/${entry.club.slug}`,
          })),
        ...entry.announcements.map((announcement) => ({
          id: `announcement-${announcement.id}`,
          title: `${entry.club.name}: ${announcement.title}`,
          description: createExcerpt(announcement.body),
          timestamp: announcement.published_at,
          type: "announcement" as const,
          href: `/clubs/${entry.club.slug}`,
        })),
      ])
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 5),
  };
}

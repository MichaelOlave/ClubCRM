import { listAnnouncementsApi, listEventsApi } from "@/lib/api/clubcrm";
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

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  const [clubs, members] = await Promise.all([getClubList(), getMemberList()]);
  const clubActivity = await Promise.all(
    clubs.map(async (club) => {
      const [events, announcements] = await Promise.all([
        listEventsApi(club.id),
        listAnnouncementsApi(club.id),
      ]);

      return { announcements, club, events };
    })
  );

  const upcomingEventCount = clubActivity.reduce(
    (count, entry) =>
      count +
      entry.events.filter(
        (event) => event.starts_at && new Date(event.starts_at).getTime() >= Date.now()
      ).length,
    0
  );
  const joinPreviewHref = clubs[0] ? `/join/${clubs[0].id}` : "/clubs";

  return {
    metrics: [
      {
        label: "Active clubs",
        value: `${clubs.filter((club) => club.status === "active").length}`,
        detail: "Club records loaded from the connected PostgreSQL-backed API.",
        tone: clubs.length ? "success" : "warning",
      },
      {
        label: "Organization members",
        value: `${members.length}`,
        detail: `${members.filter((member) => member.clubCount > 1).length} members currently belong to more than one club.`,
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
      {
        label: "Browse members",
        href: "/members",
        id: "browse-members",
        description: "Inspect organization-level members and their memberships.",
      },
      {
        label: clubs[0] ? "Preview join form" : "Open clubs",
        href: joinPreviewHref,
        id: "join-preview",
        description: clubs[0]
          ? "Open the public join route for the first club returned by the API."
          : "Create or seed a club record before testing the public join route.",
      },
    ],
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

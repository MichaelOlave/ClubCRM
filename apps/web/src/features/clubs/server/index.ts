import type { ClubDetailViewModel } from "@/features/clubs/types";
import type { AnnouncementRecord, ClubRecord, EventRecord } from "@/types/api";

const clubs: ClubRecord[] = [
  {
    id: "chess-society",
    name: "Chess Society",
    description: "Weekly strategy nights, beginner-friendly lessons, and campus tournaments.",
    status: "active",
    memberCount: 9,
    manager: "Alex Johnson",
    nextEventAt: "2026-03-28T18:00:00.000Z",
    tags: ["Strategy", "Community", "Tournaments"],
  },
  {
    id: "design-guild",
    name: "Design Guild",
    description: "Hands-on critique sessions, poster sprints, and collaborative brand projects.",
    status: "active",
    memberCount: 6,
    manager: "Maya Patel",
    nextEventAt: "2026-03-29T16:30:00.000Z",
    tags: ["Brand", "Workshops", "Portfolio"],
  },
  {
    id: "robotics-lab",
    name: "Robotics Lab",
    description: "Prototype-driven build nights focused on autonomous systems and hardware demos.",
    status: "planning",
    memberCount: 3,
    manager: "Jordan Rivera",
    nextEventAt: "2026-04-02T19:00:00.000Z",
    tags: ["Hardware", "Experimentation", "Showcase"],
  },
];

const eventsByClubId: Record<string, EventRecord[]> = {
  "chess-society": [
    {
      id: "event-chess-ladder",
      title: "March Ladder Night",
      location: "IDX Student Center",
      startsAt: "2026-03-28T18:00:00.000Z",
      status: "upcoming",
    },
  ],
  "design-guild": [
    {
      id: "event-design-poster",
      title: "Poster Sprint",
      location: "Creative Studio 204",
      startsAt: "2026-03-29T16:30:00.000Z",
      status: "upcoming",
    },
  ],
  "robotics-lab": [
    {
      id: "event-robotics-demo",
      title: "Sensor Calibration Lab",
      location: "Innovation Garage",
      startsAt: "2026-04-02T19:00:00.000Z",
      status: "draft",
    },
  ],
};

const announcementsByClubId: Record<string, AnnouncementRecord[]> = {
  "chess-society": [
    {
      id: "announcement-chess-1",
      title: "Tournament board assignments posted",
      excerpt: "Members can check pairings before Friday's ladder night.",
      publishedAt: "2026-03-22T14:00:00.000Z",
      status: "published",
    },
  ],
  "design-guild": [
    {
      id: "announcement-design-1",
      title: "Portfolio review slots opened",
      excerpt: "Seniors can claim critique sessions for next week's showcase prep.",
      publishedAt: "2026-03-21T16:00:00.000Z",
      status: "published",
    },
  ],
  "robotics-lab": [
    {
      id: "announcement-robotics-1",
      title: "Lab safety checklist draft",
      excerpt:
        "The operations team is reviewing equipment access rules before the next build night.",
      publishedAt: "2026-03-20T13:30:00.000Z",
      status: "scheduled",
    },
  ],
};

export async function getClubList(): Promise<ClubRecord[]> {
  return clubs;
}

export async function getClubDetail(clubId: string): Promise<ClubDetailViewModel | null> {
  const club = clubs.find((entry) => entry.id === clubId);

  if (!club) {
    return null;
  }

  return {
    club,
    events: eventsByClubId[clubId] ?? [],
    announcements: announcementsByClubId[clubId] ?? [],
  };
}

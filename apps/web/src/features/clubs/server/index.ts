import {
  listAnnouncementsApi,
  getClubApi,
  listClubsApi,
  listEventsApi,
  listMembersApi,
  listMembershipsApi,
} from "@/lib/api/clubcrm";
import type { ClubDetailViewModel } from "@/features/clubs/types";
import type {
  AnnouncementRecord,
  BackendAnnouncementRecord,
  BackendClubRecord,
  BackendEventRecord,
  BackendMemberRecord,
  BackendMembershipRecord,
  ClubRecord,
  ClubStatus,
  EventRecord,
} from "@/types/api";

type DatedBackendEventRecord = BackendEventRecord & {
  starts_at: string;
};

const LEADERSHIP_ROLE_KEYWORDS = [
  "president",
  "chair",
  "director",
  "lead",
  "manager",
  "coordinator",
  "captain",
  "treasurer",
  "secretary",
  "vice",
] as const;

function buildMemberNameLookup(members: BackendMemberRecord[]): Map<string, string> {
  return new Map(
    members.map((member) => [member.id, `${member.first_name} ${member.last_name}`.trim()])
  );
}

function getClubStatus(status: string): ClubStatus {
  switch (status) {
    case "planning":
    case "archived":
      return status;
    default:
      return "active";
  }
}

function isUpcomingEvent(event: BackendEventRecord): event is DatedBackendEventRecord {
  const startsAt = event.starts_at;

  return typeof startsAt === "string" && new Date(startsAt).getTime() >= Date.now();
}

function getUpcomingEvents(events: BackendEventRecord[]): DatedBackendEventRecord[] {
  return events
    .filter(isUpcomingEvent)
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at));
}

function getRolePriority(role: string): number {
  const normalizedRole = role.toLowerCase();
  const matchingIndex = LEADERSHIP_ROLE_KEYWORDS.findIndex((keyword) =>
    normalizedRole.includes(keyword)
  );

  return matchingIndex === -1 ? Number.POSITIVE_INFINITY : matchingIndex;
}

function getManagerName(
  memberships: BackendMembershipRecord[],
  memberNames: Map<string, string>
): string | null {
  const managerMembership = memberships
    .filter((membership) => Number.isFinite(getRolePriority(membership.role)))
    .slice()
    .sort((left, right) => {
      const priorityDifference = getRolePriority(left.role) - getRolePriority(right.role);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (left.joined_at ?? "").localeCompare(right.joined_at ?? "");
    })
    .find((membership) => memberNames.has(membership.member_id));

  return managerMembership ? (memberNames.get(managerMembership.member_id) ?? null) : null;
}

function getAnnouncementStatus(
  announcement: BackendAnnouncementRecord
): AnnouncementRecord["status"] {
  return new Date(announcement.published_at).getTime() > Date.now() ? "scheduled" : "published";
}

function createExcerpt(body: string): string {
  const normalizedBody = body.replace(/\s+/g, " ").trim();

  if (normalizedBody.length <= 120) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, 117)}...`;
}

function mapClubRecord(
  club: BackendClubRecord,
  memberships: BackendMembershipRecord[],
  members: BackendMemberRecord[],
  events: BackendEventRecord[]
): ClubRecord {
  const upcomingEvents = getUpcomingEvents(events);
  const memberNames = buildMemberNameLookup(members);

  return {
    id: club.id,
    organizationId: club.organization_id,
    name: club.name,
    description: club.description,
    status: getClubStatus(club.status),
    memberCount: memberships.length,
    manager: getManagerName(memberships, memberNames),
    nextEventAt: upcomingEvents[0]?.starts_at ?? null,
    tags: [],
  };
}

function mapEventRecord(event: DatedBackendEventRecord): EventRecord {
  return {
    id: event.id,
    title: event.title,
    location: event.location ?? "Location TBD",
    startsAt: event.starts_at,
    status: "upcoming",
  };
}

function mapAnnouncementRecord(announcement: BackendAnnouncementRecord): AnnouncementRecord {
  return {
    id: announcement.id,
    title: announcement.title,
    excerpt: createExcerpt(announcement.body),
    publishedAt: announcement.published_at,
    status: getAnnouncementStatus(announcement),
  };
}

export async function getClubList(): Promise<ClubRecord[]> {
  const clubs = await listClubsApi();

  if (!clubs.length) {
    return [];
  }

  const organizationIds = Array.from(new Set(clubs.map((club) => club.organization_id)));
  const [memberships, members, eventsByClub] = await Promise.all([
    listMembershipsApi(),
    Promise.all(organizationIds.map((organizationId) => listMembersApi(organizationId))).then(
      (memberLists) => memberLists.flat()
    ),
    Promise.all(clubs.map((club) => listEventsApi(club.id))),
  ]);

  const membershipsByClub = new Map<string, BackendMembershipRecord[]>();

  for (const membership of memberships) {
    const clubMemberships = membershipsByClub.get(membership.club_id) ?? [];
    clubMemberships.push(membership);
    membershipsByClub.set(membership.club_id, clubMemberships);
  }

  return clubs.map((club, index) =>
    mapClubRecord(club, membershipsByClub.get(club.id) ?? [], members, eventsByClub[index] ?? [])
  );
}

export async function getClubDetail(clubId: string): Promise<ClubDetailViewModel | null> {
  const club = await getClubApi(clubId);

  if (!club) {
    return null;
  }

  const [memberships, members, events, announcements] = await Promise.all([
    listMembershipsApi({ clubId }),
    listMembersApi(club.organization_id),
    listEventsApi(club.id),
    listAnnouncementsApi(club.id),
  ]);

  const upcomingEvents = getUpcomingEvents(events);

  return {
    club: mapClubRecord(club, memberships, members, events),
    events: upcomingEvents.map(mapEventRecord),
    announcements: announcements
      .slice()
      .sort((left, right) => right.published_at.localeCompare(left.published_at))
      .map(mapAnnouncementRecord),
  };
}

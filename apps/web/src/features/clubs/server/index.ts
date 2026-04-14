import {
  listAnnouncementsApi,
  getClubApi,
  listClubManagerGrantsApi,
  listClubsApi,
  listEventsApi,
  listMembershipsApi,
} from "@/lib/api/clubcrm";
import { canAccessClub, isOrgAdminBackendAuthSession } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import type { ClubDetailViewModel } from "@/features/clubs/types";
import type {
  AnnouncementRecord,
  BackendAnnouncementRecord,
  BackendClubRecord,
  BackendClubManagerGrantRecord,
  BackendEventRecord,
  BackendMembershipRecord,
  ClubRecord,
  ClubStatus,
  EventRecord,
} from "@/types/api";

type DatedBackendEventRecord = BackendEventRecord & {
  starts_at: string;
};

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

function getCurrentUserDisplayName(session: AuthorizedBackendAuthSession): string | null {
  return session.user.name ?? session.user.email ?? null;
}

function getManagerName(grants: BackendClubManagerGrantRecord[]): string | null {
  return grants[0]?.member_name ?? null;
}

function mapClubRecord(
  club: BackendClubRecord,
  memberships: BackendMembershipRecord[],
  events: BackendEventRecord[],
  manager: string | null
): ClubRecord {
  const upcomingEvents = getUpcomingEvents(events);

  return {
    id: club.id,
    organizationId: club.organization_id,
    name: club.name,
    description: club.description,
    status: getClubStatus(club.status),
    memberCount: memberships.length,
    manager,
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

export async function getClubList(session: AuthorizedBackendAuthSession): Promise<ClubRecord[]> {
  const clubs = await listClubsApi();

  if (!clubs.length) {
    return [];
  }

  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const [membershipsByClub, eventsByClub, grantsByClub] = await Promise.all([
    Promise.all(clubs.map((club) => listMembershipsApi({ clubId: club.id }))),
    Promise.all(clubs.map((club) => listEventsApi(club.id))),
    isOrgAdmin
      ? Promise.all(clubs.map((club) => listClubManagerGrantsApi(club.id)))
      : Promise.resolve(clubs.map((): BackendClubManagerGrantRecord[] => [])),
  ]);
  const currentUserDisplayName = getCurrentUserDisplayName(session);

  return clubs.map((club, index) =>
    mapClubRecord(
      club,
      membershipsByClub[index] ?? [],
      eventsByClub[index] ?? [],
      isOrgAdmin ? getManagerName(grantsByClub[index] ?? []) : currentUserDisplayName
    )
  );
}

export async function getClubDetail(
  clubId: string,
  session: AuthorizedBackendAuthSession
): Promise<ClubDetailViewModel | null> {
  if (!canAccessClub(session, clubId)) {
    return null;
  }

  const club = await getClubApi(clubId);

  if (!club) {
    return null;
  }

  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const [memberships, events, announcements, managerGrants] = await Promise.all([
    listMembershipsApi({ clubId }),
    listEventsApi(club.id),
    listAnnouncementsApi(club.id),
    isOrgAdmin
      ? listClubManagerGrantsApi(club.id)
      : Promise.resolve([] as BackendClubManagerGrantRecord[]),
  ]);
  const upcomingEvents = getUpcomingEvents(events);
  const manager = isOrgAdmin ? getManagerName(managerGrants) : getCurrentUserDisplayName(session);

  return {
    club: mapClubRecord(club, memberships, events, manager),
    events: upcomingEvents.map(mapEventRecord),
    announcements: announcements
      .slice()
      .sort((left, right) => right.published_at.localeCompare(left.published_at))
      .map(mapAnnouncementRecord),
  };
}

export async function getClubManagerGrants(
  clubId: string,
  session: AuthorizedBackendAuthSession
): Promise<BackendClubManagerGrantRecord[]> {
  if (!isOrgAdminBackendAuthSession(session) || !canAccessClub(session, clubId)) {
    return [];
  }

  return listClubManagerGrantsApi(clubId);
}

export { createClubAction, updateClubAction } from "./actions";

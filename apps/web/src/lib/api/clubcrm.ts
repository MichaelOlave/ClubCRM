import { fetchApiJson, fetchApiJsonOrNull } from "@/lib/api/server-data";
import type {
  BackendAnnouncementRecord,
  BackendClubRecord,
  BackendEventRecord,
  BackendMemberRecord,
  BackendMembershipRecord,
} from "@/types/api";

function buildPath(path: string, query?: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
}

export async function listClubsApi(): Promise<BackendClubRecord[]> {
  return (await fetchApiJson<BackendClubRecord[]>("/clubs/")).data;
}

export async function getClubApi(clubId: string): Promise<BackendClubRecord | null> {
  return fetchApiJsonOrNull<BackendClubRecord>(`/clubs/${clubId}`);
}

export async function listMembersApi(organizationId: string): Promise<BackendMemberRecord[]> {
  return (
    await fetchApiJson<BackendMemberRecord[]>(
      buildPath("/members/", { organization_id: organizationId })
    )
  ).data;
}

export async function getMemberApi(memberId: string): Promise<BackendMemberRecord | null> {
  return fetchApiJsonOrNull<BackendMemberRecord>(`/members/${memberId}`);
}

export async function listMembershipsApi(filters?: {
  clubId?: string;
  memberId?: string;
}): Promise<BackendMembershipRecord[]> {
  return (
    await fetchApiJson<BackendMembershipRecord[]>(
      buildPath("/memberships/", {
        club_id: filters?.clubId,
        member_id: filters?.memberId,
      })
    )
  ).data;
}

export async function listEventsApi(clubId: string): Promise<BackendEventRecord[]> {
  return (await fetchApiJson<BackendEventRecord[]>(buildPath("/events", { club_id: clubId }))).data;
}

export async function listAnnouncementsApi(clubId: string): Promise<BackendAnnouncementRecord[]> {
  return (
    await fetchApiJson<BackendAnnouncementRecord[]>(
      buildPath("/announcements", { club_id: clubId })
    )
  ).data;
}

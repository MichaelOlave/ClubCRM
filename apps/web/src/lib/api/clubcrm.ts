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

export async function createClubApi(payload: {
  organization_id: string;
  name: string;
  description: string;
  status: string;
}): Promise<BackendClubRecord> {
  return (
    await fetchApiJson<BackendClubRecord>("/clubs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function updateClubApi(
  clubId: string,
  payload: {
    description: string;
    name: string;
    status: string;
  }
): Promise<BackendClubRecord> {
  return (
    await fetchApiJson<BackendClubRecord>(`/clubs/${clubId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  ).data;
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

export async function createMemberApi(payload: {
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string | null;
}): Promise<BackendMemberRecord> {
  return (
    await fetchApiJson<BackendMemberRecord>("/members/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function updateMemberApi(
  memberId: string,
  payload: {
    email: string;
    first_name: string;
    last_name: string;
    student_id: string | null;
  }
): Promise<BackendMemberRecord> {
  return (
    await fetchApiJson<BackendMemberRecord>(`/members/${memberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  ).data;
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

export async function createMembershipApi(payload: {
  club_id: string;
  member_id: string;
  role: string;
  status: string;
}): Promise<BackendMembershipRecord> {
  return (
    await fetchApiJson<BackendMembershipRecord>("/memberships/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
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

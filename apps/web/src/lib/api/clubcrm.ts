import { fetchApiJson, fetchApiJsonOrNull } from "@/lib/api/server-data";
import type {
  BackendAnnouncementRecord,
  BackendAuditLogRecord,
  BackendClubManagerGrantRecord,
  BackendClubRecord,
  BackendDashboardRedisAnalyticsRecord,
  BackendDashboardSummaryRecord,
  BackendEventRecord,
  BackendJoinRequestApprovalRecord,
  BackendJoinRequestModerationRecord,
  BackendJoinRequestRecord,
  BackendMemberRecord,
  BackendMembershipRecord,
} from "@/types/api";

function buildPath(path: string, query?: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      searchParams.set(key, `${value}`);
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

export async function createClubApi(
  payload: {
    organization_id: string;
    name: string;
    description: string;
    status: string;
  },
  init?: RequestInit
): Promise<BackendClubRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendClubRecord>("/clubs/", {
      ...init,
      method: "POST",
      headers,
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
  },
  init?: RequestInit
): Promise<BackendClubRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendClubRecord>(`/clubs/${clubId}`, {
      ...init,
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function listClubManagerGrantsApi(
  clubId: string
): Promise<BackendClubManagerGrantRecord[]> {
  return (await fetchApiJson<BackendClubManagerGrantRecord[]>(`/clubs/${clubId}/manager-grants`))
    .data;
}

export async function createClubManagerGrantApi(
  clubId: string,
  payload: {
    member_id: string;
    role_name: string;
  },
  init?: RequestInit
): Promise<BackendClubManagerGrantRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendClubManagerGrantRecord>(`/clubs/${clubId}/manager-grants`, {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function deleteClubManagerGrantApi(
  clubId: string,
  grantId: string,
  init?: RequestInit
): Promise<void> {
  await fetchApiJson(`/clubs/${clubId}/manager-grants/${grantId}`, {
    ...init,
    method: "DELETE",
  });
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

export async function createMemberApi(
  payload: {
    organization_id: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id: string | null;
  },
  init?: RequestInit
): Promise<BackendMemberRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendMemberRecord>("/members/", {
      ...init,
      method: "POST",
      headers,
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
  },
  init?: RequestInit
): Promise<BackendMemberRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendMemberRecord>(`/members/${memberId}`, {
      ...init,
      method: "PATCH",
      headers,
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

export async function listPendingJoinRequestsApi(
  clubId: string,
  init?: RequestInit
): Promise<BackendJoinRequestRecord[]> {
  return (
    await fetchApiJson<BackendJoinRequestRecord[]>(`/forms/join-requests/${clubId}/pending`, init)
  ).data;
}

export async function approveJoinRequestApi(
  joinRequestId: string,
  payload: {
    role: string;
  },
  init?: RequestInit
): Promise<BackendJoinRequestApprovalRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendJoinRequestApprovalRecord>(
      `/forms/join-requests/${joinRequestId}/approve`,
      {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    )
  ).data;
}

export async function denyJoinRequestApi(
  joinRequestId: string,
  init?: RequestInit
): Promise<BackendJoinRequestModerationRecord> {
  return (
    await fetchApiJson<BackendJoinRequestModerationRecord>(
      `/forms/join-requests/${joinRequestId}/deny`,
      {
        ...init,
        method: "POST",
      }
    )
  ).data;
}

export async function createMembershipApi(
  payload: {
    club_id: string;
    member_id: string;
    role: string;
    status: string;
  },
  init?: RequestInit
): Promise<BackendMembershipRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendMembershipRecord>("/memberships/", {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function updateMembershipApi(
  membershipId: string,
  payload: {
    role?: string;
    status?: string;
  },
  init?: RequestInit
): Promise<BackendMembershipRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendMembershipRecord>(`/memberships/${membershipId}`, {
      ...init,
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function createEventApi(
  payload: {
    club_id: string;
    title: string;
    description: string;
    starts_at: string;
    location: string | null;
    ends_at: string | null;
  },
  init?: RequestInit
): Promise<BackendEventRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendEventRecord>("/events", {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function updateEventApi(
  eventId: string,
  payload: {
    title: string;
    description: string;
    starts_at: string;
    location: string | null;
    ends_at: string | null;
  },
  init?: RequestInit
): Promise<BackendEventRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendEventRecord>(`/events/${eventId}`, {
      ...init,
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function listEventsApi(clubId: string): Promise<BackendEventRecord[]> {
  return (await fetchApiJson<BackendEventRecord[]>(buildPath("/events", { club_id: clubId }))).data;
}

export async function deleteEventApi(eventId: string, init?: RequestInit): Promise<void> {
  await fetchApiJson(`/events/${eventId}`, {
    ...init,
    method: "DELETE",
  });
}

export async function createAnnouncementApi(
  payload: {
    club_id: string;
    title: string;
    body: string;
    published_at: string | null;
    created_by: string | null;
  },
  init?: RequestInit
): Promise<BackendAnnouncementRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendAnnouncementRecord>("/announcements", {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function updateAnnouncementApi(
  announcementId: string,
  payload: {
    title: string;
    body: string;
    published_at: string;
    created_by: string | null;
  },
  init?: RequestInit
): Promise<BackendAnnouncementRecord> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  return (
    await fetchApiJson<BackendAnnouncementRecord>(`/announcements/${announcementId}`, {
      ...init,
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    })
  ).data;
}

export async function listAnnouncementsApi(clubId: string): Promise<BackendAnnouncementRecord[]> {
  return (
    await fetchApiJson<BackendAnnouncementRecord[]>(
      buildPath("/announcements", { club_id: clubId })
    )
  ).data;
}

export async function deleteAnnouncementApi(
  announcementId: string,
  init?: RequestInit
): Promise<void> {
  await fetchApiJson(`/announcements/${announcementId}`, {
    ...init,
    method: "DELETE",
  });
}

export async function getDashboardSummaryApi(
  clubId: string
): Promise<BackendDashboardSummaryRecord> {
  return (await fetchApiJson<BackendDashboardSummaryRecord>(`/dashboard/summary/${clubId}`)).data;
}

export async function getDashboardRedisAnalyticsApi(
  clubId: string
): Promise<BackendDashboardRedisAnalyticsRecord> {
  return (
    await fetchApiJson<BackendDashboardRedisAnalyticsRecord>(`/dashboard/redis-analytics/${clubId}`)
  ).data;
}

export async function listAuditLogsApi(
  filters?: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    actorQuery?: string;
    from?: string;
    to?: string;
    limit?: number;
  },
  init?: RequestInit
): Promise<BackendAuditLogRecord[]> {
  return (
    await fetchApiJson<BackendAuditLogRecord[]>(
      buildPath("/audit-logs", {
        action: filters?.action,
        resource_type: filters?.resourceType,
        resource_id: filters?.resourceId,
        actor_query: filters?.actorQuery,
        from: filters?.from,
        to: filters?.to,
        limit: filters?.limit,
      }),
      init
    )
  ).data;
}

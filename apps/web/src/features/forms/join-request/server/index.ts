import {
  getJoinRequestContextApi,
  listPendingJoinRequestsApi,
  resolveClubApi,
} from "@/lib/api/clubcrm";
import { canAccessClub } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import type {
  JoinRequestContext,
  JoinRequestReviewViewModel,
} from "@/features/forms/join-request/types";
import type { BackendJoinRequestRecord, JoinRequestStatus } from "@/types/api";
import { getJoinRequestApiAuthHeaders } from "./authHeaders";

function getJoinRequestStatus(status: string): JoinRequestStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "denied":
      return "denied";
    default:
      return "pending";
  }
}

function mapJoinRequestRecord(joinRequest: BackendJoinRequestRecord) {
  return {
    id: joinRequest.id,
    clubId: joinRequest.club_id,
    submitterName: joinRequest.submitter_name,
    submitterEmail: joinRequest.submitter_email,
    studentId: joinRequest.student_id,
    role: joinRequest.role,
    message: joinRequest.message,
    status: getJoinRequestStatus(joinRequest.status),
  };
}

export async function getJoinRequestContext(
  clubIdentifier: string
): Promise<JoinRequestContext | null> {
  const club = await getJoinRequestContextApi(clubIdentifier);

  if (!club) {
    return null;
  }

  return {
    clubId: club.club_id,
    clubName: club.club_name,
    clubDescription: club.club_description,
    organizationName: "Champlain College",
    prompt: "Tell the club what you want to contribute and what drew you to this group.",
    roles: ["General member", "Event volunteer", "Communications support", "Leadership interest"],
  };
}

export async function getJoinRequestReview(
  clubIdentifier: string,
  session: AuthorizedBackendAuthSession
): Promise<JoinRequestReviewViewModel | null> {
  const club = await resolveClubApi(clubIdentifier);

  if (!club) {
    return null;
  }

  if (!canAccessClub(session, club.id)) {
    return null;
  }

  const requests = await listPendingJoinRequestsApi(club.id, {
    headers: await getJoinRequestApiAuthHeaders({
      originPath: `/clubs/${club.slug}/join-requests`,
    }),
  });

  return {
    clubDescription: club.description,
    clubId: club.id,
    clubSlug: club.slug,
    clubName: club.name,
    requests: requests.map(mapJoinRequestRecord),
  };
}

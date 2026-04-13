import { getClubApi, listPendingJoinRequestsApi } from "@/lib/api/clubcrm";
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

export async function getJoinRequestContext(clubId: string): Promise<JoinRequestContext | null> {
  const club = await getClubApi(clubId);

  if (!club) {
    return null;
  }

  return {
    clubId: club.id,
    clubName: club.name,
    clubDescription: club.description,
    organizationId: club.organization_id,
    organizationName: "Champlain College",
    prompt: "Tell the club what you want to contribute and what drew you to this group.",
    roles: ["General member", "Event volunteer", "Communications support", "Leadership interest"],
  };
}

export async function getJoinRequestReview(
  clubId: string
): Promise<JoinRequestReviewViewModel | null> {
  const club = await getClubApi(clubId);

  if (!club) {
    return null;
  }

  const requests = await listPendingJoinRequestsApi(clubId, {
    headers: await getJoinRequestApiAuthHeaders(),
  });

  return {
    clubDescription: club.description,
    clubId: club.id,
    clubName: club.name,
    requests: requests.map(mapJoinRequestRecord),
  };
}

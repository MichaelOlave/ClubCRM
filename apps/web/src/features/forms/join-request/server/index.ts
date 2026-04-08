import { getClubApi } from "@/lib/api/clubcrm";
import type { JoinRequestContext } from "@/features/forms/join-request/types";

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

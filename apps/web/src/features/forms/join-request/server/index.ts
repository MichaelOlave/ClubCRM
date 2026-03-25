import { getClubDetail } from "@/features/clubs/server";
import type { JoinRequestContext } from "@/features/forms/join-request/types";

export async function getJoinRequestContext(clubId: string): Promise<JoinRequestContext | null> {
  const detail = await getClubDetail(clubId);

  if (!detail) {
    return null;
  }

  return {
    clubId: detail.club.id,
    clubName: detail.club.name,
    clubDescription: detail.club.description,
    organizationName: "Champlain College",
    prompt: "Tell the club what you want to contribute and what drew you to this group.",
    roles: ["General member", "Event volunteer", "Communications support", "Leadership interest"],
  };
}

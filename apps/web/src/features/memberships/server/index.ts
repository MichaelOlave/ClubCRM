import { getClubApi, getMemberApi, listMembersApi, listMembershipsApi } from "@/lib/api/clubcrm";
import { canAccessClub } from "@/features/auth/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import type {
  BackendMemberRecord,
  BackendMembershipRecord,
  MembershipRecord,
  MembershipStatus,
} from "@/types/api";
import type { MembershipAssignmentCandidate } from "@/features/memberships/types";

function getMembershipStatus(status: string): MembershipStatus {
  return status === "pending" ? "pending" : "active";
}

function formatRoleLabel(role: string): string {
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(" ");
}

function mapMembershipRecord(
  membership: BackendMembershipRecord,
  clubName: string,
  memberName: string
): MembershipRecord {
  return {
    id: membership.id,
    clubId: membership.club_id,
    clubName,
    memberId: membership.member_id,
    memberName,
    role: formatRoleLabel(membership.role),
    status: getMembershipStatus(membership.status),
    joinedAt: membership.joined_at,
  };
}

export async function getMembershipsForClub(
  clubId: string,
  session?: AuthorizedBackendAuthSession
): Promise<MembershipRecord[]> {
  if (session && !canAccessClub(session, clubId)) {
    return [];
  }

  const club = await getClubApi(clubId);

  if (!club) {
    return [];
  }

  const memberships = await listMembershipsApi({ clubId });

  return memberships.map((membership) =>
    mapMembershipRecord(
      membership,
      membership.club_name ?? club.name,
      membership.member_name ?? membership.member_id
    )
  );
}

export async function getMembershipsForMember(memberId: string): Promise<MembershipRecord[]> {
  const [member, memberships] = await Promise.all([
    getMemberApi(memberId),
    listMembershipsApi({ memberId }),
  ]);
  const memberName = member ? `${member.first_name} ${member.last_name}`.trim() : memberId;

  return memberships.map((membership) =>
    mapMembershipRecord(membership, membership.club_name ?? membership.club_id, memberName)
  );
}

function mapMembershipCandidate(member: BackendMemberRecord): MembershipAssignmentCandidate {
  return {
    id: member.id,
    name: `${member.first_name} ${member.last_name}`.trim(),
    email: member.email,
  };
}

export async function getAssignableMembersForClub(
  clubId: string
): Promise<MembershipAssignmentCandidate[]> {
  const club = await getClubApi(clubId);

  if (!club) {
    return [];
  }

  const [members, memberships] = await Promise.all([
    listMembersApi(club.organization_id),
    listMembershipsApi({ clubId }),
  ]);

  const assignedMemberIds = new Set(memberships.map((membership) => membership.member_id));

  return members
    .filter((member) => !assignedMemberIds.has(member.id))
    .sort((left, right) => {
      const leftName = `${left.first_name} ${left.last_name}`.trim();
      const rightName = `${right.first_name} ${right.last_name}`.trim();

      return leftName.localeCompare(rightName);
    })
    .map(mapMembershipCandidate);
}

export { createMembershipAction, updateMembershipRoleAction } from "./actions";

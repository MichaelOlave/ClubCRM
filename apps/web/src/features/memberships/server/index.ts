import {
  getClubApi,
  getMemberApi,
  listClubsApi,
  listMembersApi,
  listMembershipsApi,
} from "@/lib/api/clubcrm";
import type {
  BackendMemberRecord,
  BackendMembershipRecord,
  MembershipRecord,
  MembershipStatus,
} from "@/types/api";

function buildMemberNameLookup(members: BackendMemberRecord[]): Map<string, string> {
  return new Map(
    members.map((member) => [member.id, `${member.first_name} ${member.last_name}`.trim()])
  );
}

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

export async function getMembershipsForClub(clubId: string): Promise<MembershipRecord[]> {
  const club = await getClubApi(clubId);

  if (!club) {
    return [];
  }

  const [memberships, members] = await Promise.all([
    listMembershipsApi({ clubId }),
    listMembersApi(club.organization_id),
  ]);

  const memberNames = buildMemberNameLookup(members);

  return memberships.map((membership) =>
    mapMembershipRecord(
      membership,
      club.name,
      memberNames.get(membership.member_id) ?? membership.member_id
    )
  );
}

export async function getMembershipsForMember(memberId: string): Promise<MembershipRecord[]> {
  const [member, memberships, clubs] = await Promise.all([
    getMemberApi(memberId),
    listMembershipsApi({ memberId }),
    listClubsApi(),
  ]);

  const clubNames = new Map(clubs.map((club) => [club.id, club.name]));
  const memberName = member ? `${member.first_name} ${member.last_name}`.trim() : memberId;

  return memberships.map((membership) =>
    mapMembershipRecord(
      membership,
      clubNames.get(membership.club_id) ?? membership.club_id,
      memberName
    )
  );
}

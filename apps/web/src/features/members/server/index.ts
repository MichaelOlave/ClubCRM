import { getMemberApi, listClubsApi, listMembersApi, listMembershipsApi } from "@/lib/api/clubcrm";
import { formatDateTime } from "@/lib/utils/formatters";
import type { MemberDetailViewModel } from "@/features/members/types";
import type {
  BackendMemberRecord,
  BackendMembershipRecord,
  MemberRecord,
  MembershipRecord,
} from "@/types/api";

function getMemberStatus(memberships: BackendMembershipRecord[]): MemberRecord["status"] {
  if (memberships.some((membership) => membership.status === "active")) {
    return "active";
  }

  if (memberships.some((membership) => membership.status === "inactive")) {
    return "inactive";
  }

  return "prospective";
}

function getPrimaryClubName(
  memberships: BackendMembershipRecord[],
  clubNames: Map<string, string>
): string | null {
  const primaryMembership = getPrimaryMembership(memberships);

  return primaryMembership ? (clubNames.get(primaryMembership.club_id) ?? null) : null;
}

function getPrimaryMembership(
  memberships: BackendMembershipRecord[]
): BackendMembershipRecord | null {
  const sortedMemberships = memberships
    .slice()
    .sort((left, right) => (left.joined_at ?? "").localeCompare(right.joined_at ?? ""));
  return (
    sortedMemberships.find((membership) => membership.status === "active") ??
    sortedMemberships.find((membership) => membership.status === "inactive") ??
    sortedMemberships[0] ??
    null
  );
}

function mapMemberRecord(
  member: BackendMemberRecord,
  memberships: BackendMembershipRecord[],
  clubNames: Map<string, string>
): MemberRecord {
  const primaryMembership = getPrimaryMembership(memberships);

  return {
    id: member.id,
    organizationId: member.organization_id,
    firstName: member.first_name,
    lastName: member.last_name,
    email: member.email,
    studentId: member.student_id,
    status: getMemberStatus(memberships),
    clubCount: memberships.length,
    primaryClubId: primaryMembership?.club_id ?? null,
    primaryClub: getPrimaryClubName(memberships, clubNames),
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };
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
    status:
      membership.status === "pending"
        ? "pending"
        : membership.status === "inactive"
          ? "inactive"
          : "active",
    joinedAt: membership.joined_at,
  };
}

function buildMetadata(member: BackendMemberRecord): MemberDetailViewModel["metadata"] {
  return [
    {
      label: "Organization",
      value: member.organization_id,
    },
    ...(member.created_at
      ? [
          {
            label: "Created",
            value: formatDateTime(member.created_at),
          },
        ]
      : []),
    ...(member.updated_at
      ? [
          {
            label: "Updated",
            value: formatDateTime(member.updated_at),
          },
        ]
      : []),
  ];
}

export async function getMemberList(): Promise<MemberRecord[]> {
  const clubs = await listClubsApi();

  if (!clubs.length) {
    return [];
  }

  const organizationIds = Array.from(new Set(clubs.map((club) => club.organization_id)));

  const [members, memberships] = await Promise.all([
    Promise.all(organizationIds.map((organizationId) => listMembersApi(organizationId))).then(
      (memberLists) => memberLists.flat()
    ),
    listMembershipsApi(),
  ]);

  const clubNames = new Map(clubs.map((club) => [club.id, club.name]));
  const membershipsByMember = new Map<string, BackendMembershipRecord[]>();

  for (const membership of memberships) {
    const memberMemberships = membershipsByMember.get(membership.member_id) ?? [];
    memberMemberships.push(membership);
    membershipsByMember.set(membership.member_id, memberMemberships);
  }

  return members.map((member) =>
    mapMemberRecord(member, membershipsByMember.get(member.id) ?? [], clubNames)
  );
}

export async function getMemberDetail(memberId: string): Promise<MemberDetailViewModel | null> {
  const member = await getMemberApi(memberId);

  if (!member) {
    return null;
  }

  const [clubs, memberships] = await Promise.all([
    listClubsApi(),
    listMembershipsApi({ memberId }),
  ]);

  const clubNames = new Map(clubs.map((club) => [club.id, club.name]));
  const memberName = `${member.first_name} ${member.last_name}`.trim();

  return {
    member: mapMemberRecord(member, memberships, clubNames),
    memberships: memberships.map((membership) =>
      mapMembershipRecord(
        membership,
        membership.club_name ?? clubNames.get(membership.club_id) ?? membership.club_id,
        memberName
      )
    ),
    metadata: buildMetadata(member),
  };
}

export { createMemberAction, deleteMemberAction, updateMemberAction } from "./actions";

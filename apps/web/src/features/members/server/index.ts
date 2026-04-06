import { getMemberApi, listClubsApi, listMembersApi, listMembershipsApi } from "@/lib/api/clubcrm";
import { formatDateTime } from "@/lib/utils/formatters";
import type { MemberDetailViewModel } from "@/features/members/types";
import type { BackendMemberRecord, BackendMembershipRecord, MemberRecord } from "@/types/api";

function getMemberStatus(memberships: BackendMembershipRecord[]): MemberRecord["status"] {
  return memberships.some((membership) => membership.status !== "pending")
    ? "active"
    : "prospective";
}

function getPrimaryClubName(
  memberships: BackendMembershipRecord[],
  clubNames: Map<string, string>
): string | null {
  const sortedMemberships = memberships
    .slice()
    .sort((left, right) => (left.joined_at ?? "").localeCompare(right.joined_at ?? ""));
  const primaryMembership =
    sortedMemberships.find((membership) => membership.status !== "pending") ?? sortedMemberships[0];

  return primaryMembership ? (clubNames.get(primaryMembership.club_id) ?? null) : null;
}

function mapMemberRecord(
  member: BackendMemberRecord,
  memberships: BackendMembershipRecord[],
  clubNames: Map<string, string>
): MemberRecord {
  return {
    id: member.id,
    organizationId: member.organization_id,
    firstName: member.first_name,
    lastName: member.last_name,
    email: member.email,
    studentId: member.student_id,
    status: getMemberStatus(memberships),
    clubCount: memberships.length,
    primaryClub: getPrimaryClubName(memberships, clubNames),
    createdAt: member.created_at,
    updatedAt: member.updated_at,
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

  return {
    member: mapMemberRecord(member, memberships, clubNames),
    metadata: buildMetadata(member),
  };
}

import type { MembershipRecord } from "@/types/api";

const memberships: MembershipRecord[] = [
  {
    id: "membership-chess-alex",
    clubId: "chess-society",
    clubName: "Chess Society",
    memberId: "alex-johnson",
    memberName: "Alex Johnson",
    role: "President",
    status: "active",
    joinedAt: "2025-09-02T12:00:00.000Z",
  },
  {
    id: "membership-chess-maya",
    clubId: "chess-society",
    clubName: "Chess Society",
    memberId: "maya-patel",
    memberName: "Maya Patel",
    role: "Treasurer",
    status: "active",
    joinedAt: "2025-09-18T12:00:00.000Z",
  },
  {
    id: "membership-design-evan",
    clubId: "design-guild",
    clubName: "Design Guild",
    memberId: "evan-lee",
    memberName: "Evan Lee",
    role: "Member",
    status: "active",
    joinedAt: "2025-10-04T12:00:00.000Z",
  },
  {
    id: "membership-design-maya",
    clubId: "design-guild",
    clubName: "Design Guild",
    memberId: "maya-patel",
    memberName: "Maya Patel",
    role: "Communications Manager",
    status: "active",
    joinedAt: "2025-09-21T12:00:00.000Z",
  },
  {
    id: "membership-robotics-jordan",
    clubId: "robotics-lab",
    clubName: "Robotics Lab",
    memberId: "jordan-rivera",
    memberName: "Jordan Rivera",
    role: "Lab Coordinator",
    status: "pending",
    joinedAt: "2026-01-11T12:00:00.000Z",
  },
];

export async function getMembershipsForClub(clubId: string): Promise<MembershipRecord[]> {
  return memberships.filter((membership) => membership.clubId === clubId);
}

export async function getMembershipsForMember(memberId: string): Promise<MembershipRecord[]> {
  return memberships.filter((membership) => membership.memberId === memberId);
}

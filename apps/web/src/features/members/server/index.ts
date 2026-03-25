import type { MemberDetailViewModel } from "@/features/members/types";
import type { MemberRecord } from "@/types/api";

const members: MemberRecord[] = [
  {
    id: "alex-johnson",
    firstName: "Alex",
    lastName: "Johnson",
    email: "alex.johnson@champlain.edu",
    studentId: "C10432",
    status: "active",
    clubCount: 1,
    primaryClub: "Chess Society",
  },
  {
    id: "maya-patel",
    firstName: "Maya",
    lastName: "Patel",
    email: "maya.patel@champlain.edu",
    studentId: "C10841",
    status: "active",
    clubCount: 2,
    primaryClub: "Design Guild",
  },
  {
    id: "evan-lee",
    firstName: "Evan",
    lastName: "Lee",
    email: "evan.lee@champlain.edu",
    studentId: "C10297",
    status: "prospective",
    clubCount: 1,
    primaryClub: "Design Guild",
  },
  {
    id: "jordan-rivera",
    firstName: "Jordan",
    lastName: "Rivera",
    email: "jordan.rivera@champlain.edu",
    studentId: "C10976",
    status: "active",
    clubCount: 1,
    primaryClub: "Robotics Lab",
  },
];

const notesByMemberId: Record<string, string[]> = {
  "alex-johnson": [
    "Leads weekly ladder sessions and manages tournament pairings.",
    "Acts as the primary club contact for new-member onboarding.",
  ],
  "maya-patel": [
    "Supports both design critiques and club communications.",
    "Cross-club participation makes Maya a strong test case for organization-level member records.",
  ],
  "evan-lee": ["Recently submitted a portfolio review request for the next design sprint."],
  "jordan-rivera": ["Pending robotics leadership review before the next build-night cycle."],
};

export async function getMemberList(): Promise<MemberRecord[]> {
  return members;
}

export async function getMemberDetail(memberId: string): Promise<MemberDetailViewModel | null> {
  const member = members.find((entry) => entry.id === memberId);

  if (!member) {
    return null;
  }

  return {
    member,
    notes: notesByMemberId[memberId] ?? [],
  };
}

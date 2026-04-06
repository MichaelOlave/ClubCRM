import type { MembershipRecord } from "@/types/api";

export type MembershipTableModel = {
  description?: string;
  memberships: MembershipRecord[];
  title?: string;
};

export type MembershipAssignmentCandidate = {
  email: string;
  id: string;
  name: string;
};

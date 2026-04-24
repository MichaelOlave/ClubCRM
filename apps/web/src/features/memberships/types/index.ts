import type { ReactNode } from "react";

import type { MembershipRecord } from "@/types/api";

export type MembershipTableModel = {
  actionsHeader?: string;
  description?: string;
  headerActions?: ReactNode;
  memberships: MembershipRecord[];
  renderAssignment?: (membership: MembershipRecord) => ReactNode;
  renderMembershipStatus?: (membership: MembershipRecord) => ReactNode;
  renderRole?: (membership: MembershipRecord) => ReactNode;
  renderActions?: (membership: MembershipRecord) => ReactNode;
  title?: string;
};

export type MembershipAssignmentCandidate = {
  email: string;
  id: string;
  name: string;
};

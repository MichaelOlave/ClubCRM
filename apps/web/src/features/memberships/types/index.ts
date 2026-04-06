import type { ReactNode } from "react";

import type { MembershipRecord } from "@/types/api";

export type MembershipTableModel = {
  actionsHeader?: string;
  description?: string;
  memberships: MembershipRecord[];
  renderActions?: (membership: MembershipRecord) => ReactNode;
  title?: string;
};

export type MembershipAssignmentCandidate = {
  email: string;
  id: string;
  name: string;
};

import type { MembershipRecord } from "@/types/api";

export type MembershipTableModel = {
  description?: string;
  memberships: MembershipRecord[];
  title?: string;
};

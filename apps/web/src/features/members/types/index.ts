import type { MemberRecord } from "@/types/api";

export type MemberListViewModel = {
  members: MemberRecord[];
};

export type MemberDetailViewModel = {
  member: MemberRecord;
  notes: string[];
};

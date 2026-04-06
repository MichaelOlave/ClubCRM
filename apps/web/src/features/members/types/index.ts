import type { MemberRecord } from "@/types/api";

export type MemberListViewModel = {
  members: MemberRecord[];
};

export type MemberDetailField = {
  label: string;
  value: string;
};

export type MemberDetailViewModel = {
  member: MemberRecord;
  metadata: MemberDetailField[];
};

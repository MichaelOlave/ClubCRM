import type { JoinRequestRecord } from "@/types/api";

export type JoinRequestContext = {
  clubDescription: string;
  clubId: string;
  clubName: string;
  organizationId: string;
  organizationName: string;
  prompt: string;
  roles: string[];
};

export type JoinRequestReviewViewModel = {
  clubDescription: string;
  clubId: string;
  clubName: string;
  requests: JoinRequestRecord[];
};

import type { AuditAction, AuditResourceType } from "@/types/api";

export type AuditLogFilterValues = {
  action: string;
  actorQuery: string;
  from: string;
  limit: string;
  page: string;
  resourceId: string;
  resourceType: string;
  to: string;
};

export type AuditLogEntryViewModel = {
  action: AuditAction;
  actorLabel: string;
  actorSub: string;
  apiRoute: string;
  httpMethod: string;
  id: string;
  occurredAt: string;
  originPath: string | null;
  requestId: string;
  resourceId: string;
  resourceLabel: string;
  resourceType: AuditResourceType;
  summaryLines: string[];
};

export type AuditLogViewModel = {
  availableActions: AuditAction[];
  availableResourceTypes: AuditResourceType[];
  errorMessage?: string;
  filters: AuditLogFilterValues;
  logs: AuditLogEntryViewModel[];
  pagination: {
    hasNext: boolean;
    hasPrevious: boolean;
    page: number;
    pageSize: number;
  };
  status: "available" | "error";
};

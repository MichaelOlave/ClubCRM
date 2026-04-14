import type { AuditAction, AuditResourceType } from "@/types/api";

export type AuditLogFilterValues = {
  action: string;
  actorQuery: string;
  from: string;
  limit: string;
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
  status: "available" | "error";
};

import { getAdminApiHeaders } from "@/lib/api/adminAuthHeaders";
import { listAuditLogsApi } from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import type { AuditAction, AuditResourceType, BackendAuditLogRecord } from "@/types/api";
import type { AuditLogFilterValues, AuditLogViewModel } from "@/features/audit/types";

const AVAILABLE_ACTIONS: AuditAction[] = ["create", "update", "delete", "approve", "deny"];
const AVAILABLE_RESOURCE_TYPES: AuditResourceType[] = [
  "club",
  "member",
  "membership",
  "event",
  "announcement",
  "join_request",
];

function getQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeLimit(value: string): string {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return "50";
  }

  return `${Math.min(parsed, 100)}`;
}

function normalizePage(value: string): string {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return "1";
  }

  return `${parsed}`;
}

function normalizeFilters(query: {
  action?: string | string[];
  actorQuery?: string | string[];
  from?: string | string[];
  limit?: string | string[];
  page?: string | string[];
  resourceId?: string | string[];
  resourceType?: string | string[];
  to?: string | string[];
}): AuditLogFilterValues {
  return {
    action: getQueryValue(query.action),
    actorQuery: getQueryValue(query.actorQuery),
    from: getQueryValue(query.from),
    limit: normalizeLimit(getQueryValue(query.limit)),
    page: normalizePage(getQueryValue(query.page)),
    resourceId: getQueryValue(query.resourceId),
    resourceType: getQueryValue(query.resourceType),
    to: getQueryValue(query.to),
  };
}

function formatSummaryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatSummaryValue(entry)).join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${formatSummaryValue(entry)}`)
      .join(", ");
  }

  return "Not provided";
}

function buildSummaryLines(summaryJson: Record<string, unknown>): string[] {
  return Object.entries(summaryJson).map(
    ([key, value]) => `${key.replace(/_/g, " ")}: ${formatSummaryValue(value)}`
  );
}

function mapAuditLogRecord(auditLog: BackendAuditLogRecord) {
  return {
    id: auditLog.id,
    occurredAt: auditLog.occurred_at,
    action: auditLog.action,
    actorLabel: auditLog.actor.name ?? auditLog.actor.email ?? auditLog.actor.sub,
    actorSub: auditLog.actor.sub,
    resourceType: auditLog.resource.type,
    resourceId: auditLog.resource.id,
    resourceLabel: auditLog.resource.label ?? auditLog.resource.id,
    apiRoute: auditLog.api_route,
    httpMethod: auditLog.http_method,
    originPath: auditLog.origin_path,
    requestId: auditLog.request_id,
    summaryLines: buildSummaryLines(auditLog.summary_json),
  };
}

export async function getAuditLogViewModel(query: {
  action?: string | string[];
  actorQuery?: string | string[];
  from?: string | string[];
  limit?: string | string[];
  page?: string | string[];
  resourceId?: string | string[];
  resourceType?: string | string[];
  to?: string | string[];
}): Promise<AuditLogViewModel> {
  const filters = normalizeFilters(query);

  try {
    const auditLogs = await listAuditLogsApi(
      {
        action: filters.action || undefined,
        resourceType: filters.resourceType || undefined,
        resourceId: filters.resourceId || undefined,
        actorQuery: filters.actorQuery || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        limit: Number.parseInt(filters.limit, 10),
        page: Number.parseInt(filters.page, 10),
      },
      {
        headers: await getAdminApiHeaders({ originPath: "/system/audit" }),
      }
    );

    return {
      status: "available",
      filters,
      logs: auditLogs.items.map(mapAuditLogRecord),
      pagination: {
        page: auditLogs.pagination.page,
        pageSize: auditLogs.pagination.page_size,
        hasNext: auditLogs.pagination.has_next,
        hasPrevious: auditLogs.pagination.has_previous,
      },
      availableActions: AVAILABLE_ACTIONS,
      availableResourceTypes: AVAILABLE_RESOURCE_TYPES,
    };
  } catch (error) {
    return {
      status: "error",
      errorMessage: getApiErrorMessage(
        error,
        "The audit log could not be loaded from the backend right now."
      ),
      filters,
      logs: [],
      pagination: {
        page: Number.parseInt(filters.page, 10),
        pageSize: Number.parseInt(filters.limit, 10),
        hasNext: false,
        hasPrevious: Number.parseInt(filters.page, 10) > 1,
      },
      availableActions: AVAILABLE_ACTIONS,
      availableResourceTypes: AVAILABLE_RESOURCE_TYPES,
    };
  }
}

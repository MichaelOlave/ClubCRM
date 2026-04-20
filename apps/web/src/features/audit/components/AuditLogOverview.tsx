import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { Input } from "@/components/shadcn/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { formatDateTime } from "@/lib/utils/formatters";
import type { AuditLogViewModel } from "@/features/audit/types";
import { TEXT_LIMITS } from "@/lib/textLimits";

type Props = {
  viewModel: AuditLogViewModel;
};

function buildAuditLogHref(filters: AuditLogViewModel["filters"], page: number): string {
  const params = new URLSearchParams();

  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.resourceType) {
    params.set("resourceType", filters.resourceType);
  }
  if (filters.actorQuery) {
    params.set("actorQuery", filters.actorQuery);
  }
  if (filters.resourceId) {
    params.set("resourceId", filters.resourceId);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  params.set("limit", filters.limit);
  params.set("page", `${page}`);

  const query = params.toString();
  return query ? `/system/audit?${query}` : "/system/audit";
}

function getActionVariant(action: string) {
  switch (action) {
    case "create":
      return "success";
    case "update":
      return "warning";
    case "delete":
      return "destructive";
    default:
      return "muted";
  }
}

export function AuditLogOverview({ viewModel }: Props) {
  return (
    <div className="space-y-6">
      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Filters</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Narrow the admin activity stream by action, resource, actor, or time window.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="get">
          <input name="page" type="hidden" value="1" />
          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Action</span>
            <select
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              defaultValue={viewModel.filters.action}
              name="action"
            >
              <option value="">All actions</option>
              {viewModel.availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Resource</span>
            <select
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              defaultValue={viewModel.filters.resourceType}
              name="resourceType"
            >
              <option value="">All resources</option>
              {viewModel.availableResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {resourceType}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Actor</span>
            <Input
              defaultValue={viewModel.filters.actorQuery}
              maxLength={TEXT_LIMITS.auditFilter}
              name="actorQuery"
              placeholder="email, name, or subject"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Resource ID</span>
            <Input
              defaultValue={viewModel.filters.resourceId}
              maxLength={TEXT_LIMITS.resourceId}
              name="resourceId"
              placeholder="club-123 or request id"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>From</span>
            <Input
              defaultValue={viewModel.filters.from}
              maxLength={TEXT_LIMITS.isoDateTimeFilter}
              name="from"
              placeholder="2026-04-14T00:00:00Z"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>To</span>
            <Input
              defaultValue={viewModel.filters.to}
              maxLength={TEXT_LIMITS.isoDateTimeFilter}
              name="to"
              placeholder="2026-04-14T23:59:59Z"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-foreground">
            <span>Limit</span>
            <Input
              defaultValue={viewModel.filters.limit}
              min="1"
              max="100"
              name="limit"
              type="number"
            />
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <Button type="submit">Apply filters</Button>
            <Button asChild type="button" variant="ghost">
              <Link href="/system/audit">Reset</Link>
            </Button>
          </div>
        </form>
      </Card>

      {viewModel.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Audit log unavailable</AlertTitle>
          <AlertDescription>{viewModel.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Recent admin activity</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Newest entries first, with actor, target, request path, and a safe summary of the
            change.
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Page {viewModel.pagination.page} • {viewModel.pagination.pageSize} per page
          </p>
        </div>

        {viewModel.logs.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewModel.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {formatDateTime(log.occurredAt)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{log.requestId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{log.actorLabel}</p>
                      <p className="font-mono text-xs text-muted-foreground">{log.actorSub}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{log.resourceLabel}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {log.resourceType} / {log.resourceId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-foreground">
                        {log.httpMethod} {log.apiRoute}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.originPath ?? "Origin path unavailable"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.summaryLines.length ? (
                      <div className="space-y-1">
                        {log.summaryLines.map((line) => (
                          <p className="text-xs leading-5 text-muted-foreground" key={line}>
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No safe summary stored.</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            description="Try widening the filters or create an admin-side change such as a club or member update."
            title="No audit entries match the current filters"
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button
            asChild={viewModel.pagination.hasPrevious}
            disabled={!viewModel.pagination.hasPrevious}
            type="button"
            variant="outline"
          >
            {viewModel.pagination.hasPrevious ? (
              <Link href={buildAuditLogHref(viewModel.filters, viewModel.pagination.page - 1)}>
                Previous page
              </Link>
            ) : (
              <span>Previous page</span>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Showing page {viewModel.pagination.page}
            {viewModel.pagination.hasNext ? " with more results available." : "."}
          </p>
          <Button
            asChild={viewModel.pagination.hasNext}
            disabled={!viewModel.pagination.hasNext}
            type="button"
            variant="outline"
          >
            {viewModel.pagination.hasNext ? (
              <Link href={buildAuditLogHref(viewModel.filters, viewModel.pagination.page + 1)}>
                Next page
              </Link>
            ) : (
              <span>Next page</span>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

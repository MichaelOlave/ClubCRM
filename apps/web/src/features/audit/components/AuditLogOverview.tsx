"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  Hash,
  RotateCcw,
  Search,
  User,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

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

function getActionVariant(action: string): "success" | "warning" | "destructive" | "muted" {
  switch (action) {
    case "create":
    case "approve":
      return "success";
    case "update":
      return "warning";
    case "delete":
    case "deny":
      return "destructive";
    default:
      return "muted";
  }
}

export function AuditLogOverview({ viewModel }: Props) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[1.5rem] border shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <button
          className="flex w-full items-center justify-between p-6 transition-colors hover:bg-muted/30 sm:px-8"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Filter className="size-5" />
            </div>
            <div className="text-left space-y-0.5">
              <h2 className="text-xl font-semibold text-foreground">Filter activity</h2>
              <p className="text-sm text-muted-foreground">
                Search by action, resource, actor, or time window.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {isFiltersOpen ? "Hide filters" : "Show filters"}
            </span>
            {isFiltersOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </div>
        </button>

        {isFiltersOpen && (
          <div className="border-t bg-muted/5 p-6 sm:px-8 sm:pb-8">
            <form className="grid gap-x-4 gap-y-5 md:grid-cols-2 lg:grid-cols-4" method="get">
              <input name="page" type="hidden" value="1" />

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="size-3.5 opacity-60" />
                  <span>Action</span>
                </label>
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
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Globe className="size-3.5 opacity-60" />
                  <span>Resource Type</span>
                </label>
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
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="size-3.5 opacity-60" />
                  <span>Actor</span>
                </label>
                <Input
                  defaultValue={viewModel.filters.actorQuery}
                  maxLength={TEXT_LIMITS.auditFilter}
                  name="actorQuery"
                  placeholder="Email or name..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Hash className="size-3.5 opacity-60" />
                  <span>Resource ID</span>
                </label>
                <Input
                  defaultValue={viewModel.filters.resourceId}
                  maxLength={TEXT_LIMITS.resourceId}
                  name="resourceId"
                  placeholder="ID or request ID..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="size-3.5 opacity-60" />
                  <span>From</span>
                </label>
                <Input
                  defaultValue={viewModel.filters.from}
                  maxLength={TEXT_LIMITS.isoDateTimeFilter}
                  name="from"
                  placeholder="YYYY-MM-DD..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="size-3.5 opacity-60" />
                  <span>To</span>
                </label>
                <Input
                  defaultValue={viewModel.filters.to}
                  maxLength={TEXT_LIMITS.isoDateTimeFilter}
                  name="to"
                  placeholder="YYYY-MM-DD..."
                />
              </div>

              <div className="flex flex-wrap items-end gap-3 lg:col-span-2">
                <div className="flex-1 space-y-3">
                  <Button className="w-full" type="submit">
                    <Search className="size-4" />
                    Apply Filters
                  </Button>
                </div>
                <Button asChild type="button" variant="ghost">
                  <Link href="/system/audit">
                    <RotateCcw className="size-4" />
                    Reset
                  </Link>
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {viewModel.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Audit log unavailable</AlertTitle>
          <AlertDescription>{viewModel.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-[1.5rem] border shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="border-b p-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Recent admin activity</h2>
              <p className="text-sm text-muted-foreground">
                Detailed stream of system changes and administrative actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-2xl border bg-muted/30 p-1">
                {[10, 20, 50].map((limit) => {
                  const isActive = Number(viewModel.filters.limit) === limit;
                  return (
                    <Button
                      asChild={!isActive}
                      className={cn(
                        "h-8 rounded-xl px-3 text-xs font-bold transition-all",
                        isActive
                          ? "bg-background text-foreground shadow-sm hover:bg-background"
                          : "text-muted-foreground hover:bg-transparent hover:text-foreground"
                      )}
                      key={limit}
                      variant="ghost"
                    >
                      {isActive ? (
                        <span>{limit} per page</span>
                      ) : (
                        <Link
                          href={buildAuditLogHref({ ...viewModel.filters, limit: `${limit}` }, 1)}
                        >
                          {limit}
                        </Link>
                      )}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-1.5 text-[10px] font-bold whitespace-nowrap uppercase tracking-widest text-muted-foreground">
                <span>Page {viewModel.pagination.page}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {viewModel.logs.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] px-6 sm:pl-8">When</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="min-w-[150px]">Actor</TableHead>
                  <TableHead className="min-w-[150px]">Resource</TableHead>
                  <TableHead className="min-w-[150px]">Context</TableHead>
                  <TableHead className="min-w-[200px] px-6 sm:pr-8">Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="px-6 sm:pl-8">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground whitespace-nowrap">
                          {formatDateTime(log.occurredAt)}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          {log.requestId.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{log.actorLabel}</p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">
                          {log.actorSub.slice(0, 12)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{log.resourceLabel}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {log.resourceType.replace("_", " ")} / {log.resourceId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-mono text-[10px] font-bold text-foreground">
                          {log.httpMethod} {log.apiRoute}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {log.originPath ?? "Internal"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 sm:pr-8">
                      {log.summaryLines.length ? (
                        <div className="space-y-1">
                          {log.summaryLines.map((line) => (
                            <p className="text-xs leading-5 text-muted-foreground" key={line}>
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No summary data.</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                description="Try widening the filters or create an admin-side change such as a club or member update."
                title="No audit entries match filters"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            <Button
              asChild={viewModel.pagination.hasPrevious}
              className={cn(!viewModel.pagination.hasPrevious && "pointer-events-none")}
              disabled={!viewModel.pagination.hasPrevious}
              size="sm"
              variant="outline"
            >
              {viewModel.pagination.hasPrevious ? (
                <Link href={buildAuditLogHref(viewModel.filters, viewModel.pagination.page - 1)}>
                  <ArrowLeft className="size-4" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 opacity-50">
                  <ArrowLeft className="size-4" />
                  Previous
                </span>
              )}
            </Button>
            <Button
              asChild={viewModel.pagination.hasNext}
              className={cn(!viewModel.pagination.hasNext && "pointer-events-none")}
              disabled={!viewModel.pagination.hasNext}
              size="sm"
              variant="outline"
            >
              {viewModel.pagination.hasNext ? (
                <Link href={buildAuditLogHref(viewModel.filters, viewModel.pagination.page + 1)}>
                  Next
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 opacity-50">
                  Next
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {viewModel.logs.length > 0 ? (
              <>
                Page <span className="text-foreground">{viewModel.pagination.page}</span>
                {viewModel.pagination.hasNext ? " • more available" : " • end of log"}
              </>
            ) : (
              "No results found"
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}

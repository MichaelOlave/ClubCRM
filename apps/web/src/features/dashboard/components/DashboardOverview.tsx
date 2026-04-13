import Link from "next/link";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { DashboardViewModel } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils/formatters";

type Props = {
  viewModel: DashboardViewModel;
};

function getBadgeVariant(tone: DashboardViewModel["metrics"][number]["tone"]) {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "muted";
  }
}

function getRedisStatusVariant(status: string) {
  switch (status) {
    case "warm":
      return "success";
    case "cold":
    case "down":
    case "unavailable":
      return "warning";
    default:
      return "muted";
  }
}

function getActivityLabel(type: DashboardViewModel["activity"][number]["type"]) {
  switch (type) {
    case "announcement":
      return "Announcement";
    case "club":
      return "Club";
    case "event":
      return "Event";
    case "form":
      return "Form";
    case "member":
      return "Member";
    default:
      return "Activity";
  }
}

export function DashboardOverview({ viewModel }: Props) {
  return (
    <div className="space-y-6">
      <Alert variant="info">
        <AlertDescription>
          This dashboard now reads live club, member, event, and announcement data from the backend
          API.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        {viewModel.metrics.map((metric) => (
          <Card
            className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8"
            key={metric.label}
          >
            <Badge variant={getBadgeVariant(metric.tone)}>{metric.label}</Badge>
            <div className="space-y-2">
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {metric.value}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{metric.detail}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Object.entries(viewModel.redisViews).map(([key, view]) => (
          <Card
            className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8"
            key={key}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
                  Redis analytics
                </p>
                <h2 className="text-2xl font-semibold text-foreground">{view.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{view.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {view.metrics.map((metric) => (
                  <div className="rounded-[1.25rem] border border-border p-4" key={metric.label}>
                    <Badge variant={getBadgeVariant(metric.tone)}>{metric.label}</Badge>
                    <p className="mt-3 text-2xl font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.detail}</p>
                  </div>
                ))}
              </div>

              {view.clubSummaries.length ? (
                <div className="space-y-3">
                  {view.clubSummaries.map((clubSummary) => (
                    <div
                      className="rounded-[1.25rem] border border-border p-4"
                      key={`${key}-${clubSummary.clubId}`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {clubSummary.clubName}
                        </h3>
                        <Badge variant={getRedisStatusVariant(clubSummary.cacheStatus)}>
                          {clubSummary.cacheStatus}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {clubSummary.totalMembers} members, {clubSummary.totalEvents} events,{" "}
                        {clubSummary.totalAnnouncements} announcements
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {clubSummary.cacheDetail} with {clubSummary.hitRate} hit rate across{" "}
                        {clubSummary.requestCount}.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Create or load at least one club to warm the dashboard cache and surface Redis analytics."
                  title="No cached club summaries yet"
                />
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
                Recent activity
              </p>
              <h2 className="text-2xl font-semibold text-foreground">What changed lately</h2>
            </div>

            {viewModel.activity.length ? (
              <div className="space-y-4">
                {viewModel.activity.map((item) => (
                  <div className="rounded-[1.25rem] border border-border p-4" key={item.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="muted">{getActivityLabel(item.type)}</Badge>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {formatDateTime(item.timestamp)}
                      </p>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="No recent announcements or scheduled events were returned by the API."
                title="No activity yet"
              />
            )}
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border border-brand-border bg-brand-surface p-6 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
                Quick actions
              </p>
              <h2 className="text-2xl font-semibold text-foreground">Jump into the MVP routes</h2>
            </div>

            <div className="space-y-4">
              {viewModel.quickActions.map((action) => (
                <div
                  className="rounded-[1.25rem] border border-brand-border bg-card/70 p-4"
                  key={action.id}
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{action.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <Button asChild variant="secondary">
                      <Link href={action.href}>Open route</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

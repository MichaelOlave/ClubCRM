import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { RedisDiagnosticsViewModel } from "@/features/health/types";

type Props = {
  views: RedisDiagnosticsViewModel;
};

function getMetricBadgeVariant(tone: "default" | "success" | "warning") {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "muted";
  }
}

function getCacheStatusVariant(status: string) {
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

export function RedisDiagnosticsOverview({ views }: Props) {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
          Redis telemetry
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Dashboard cache diagnostics
        </h2>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Live cache signals for the dashboard summary endpoints, grouped into operational health
          and user-facing freshness behavior.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(views).map(([key, view]) => (
          <Card
            className="rounded-[1.75rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8"
            key={key}
          >
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:items-start">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-foreground sm:text-[2rem]">
                    {view.title}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {view.description}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {view.metrics.map((metric) => (
                    <div
                      className="rounded-[1.35rem] border border-border bg-background/70 p-5"
                      key={metric.label}
                    >
                      <Badge variant={getMetricBadgeVariant(metric.tone)}>{metric.label}</Badge>
                      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                        {metric.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {view.clubSummaries.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {view.clubSummaries.map((clubSummary) => (
                    <div
                      className="rounded-[1.35rem] border border-border bg-background/70 p-5"
                      key={`${key}-${clubSummary.clubId}`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {clubSummary.clubName}
                        </h4>
                        <Badge variant={getCacheStatusVariant(clubSummary.cacheStatus)}>
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
                  description="Create or load at least one club to warm the dashboard cache and surface Redis telemetry here."
                  title="No cached club summaries yet"
                />
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

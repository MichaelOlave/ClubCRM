import { Database, Server, Zap, History, LayoutDashboard, Info } from "lucide-react";
import { Badge } from "@/components/shadcn/badge";
import { Card, CardContent, CardHeader } from "@/components/shadcn/card";
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
  switch (status.toLowerCase()) {
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

function getMetricIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("memory") || l.includes("size")) return <Database className="h-4 w-4" />;
  if (l.includes("latency") || l.includes("time") || l.includes("speed"))
    return <Zap className="h-4 w-4" />;
  if (l.includes("hit") || l.includes("rate") || l.includes("ratio"))
    return <History className="h-4 w-4" />;
  return <Server className="h-4 w-4" />;
}

export function RedisDiagnosticsOverview({ views }: Props) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-brand" />
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
              Redis telemetry
            </p>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Dashboard cache diagnostics
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Live cache signals for the dashboard summary endpoints, grouped into operational health
            and user-facing freshness behavior.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {Object.entries(views).map(([key, view]) => (
          <div className="space-y-6" key={key}>
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-bold text-foreground">{view.title}</h3>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                {key}
              </Badge>
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {view.description}
            </p>

            <div className="grid gap-6 xl:grid-cols-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:col-span-4 xl:grid-cols-4">
                {view.metrics.map((metric) => (
                  <Card
                    className="relative overflow-hidden rounded-2xl border bg-card/50 transition-all hover:bg-card shadow-sm"
                    key={metric.label}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Badge
                        variant={getMetricBadgeVariant(metric.tone)}
                        className="text-[10px] px-2 py-0"
                      >
                        {metric.label}
                      </Badge>
                      <div className="text-muted-foreground/30">{getMetricIcon(metric.label)}</div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-3xl font-bold tracking-tight text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {metric.detail}
                      </p>
                    </CardContent>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] grayscale">
                      <div className="scale-[3]">{getMetricIcon(metric.label)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {view.clubSummaries.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {view.clubSummaries.map((clubSummary) => (
                  <Card
                    className="group border bg-background/50 transition-all hover:border-brand/30 hover:bg-background shadow-sm"
                    key={`${key}-${clubSummary.clubId}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-foreground group-hover:text-brand transition-colors">
                          {clubSummary.clubName}
                        </h4>
                        <Badge
                          variant={getCacheStatusVariant(clubSummary.cacheStatus)}
                          className="capitalize"
                        >
                          {clubSummary.cacheStatus}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span>{clubSummary.totalMembers} members</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span>{clubSummary.totalEvents} events</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                          <Info className="h-3 w-3" />
                          <span>Performance</span>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                          {clubSummary.hitRate} hit rate across {clubSummary.requestCount} requests.
                          <br />
                          <span className="italic text-muted-foreground/70">
                            {clubSummary.cacheDetail}
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                className="rounded-2xl border-dashed py-12"
                description="Create or load at least one club to warm the dashboard cache and surface Redis telemetry here."
                title="No cached club summaries yet"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

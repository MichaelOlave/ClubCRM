import Link from "next/link";
import { Calendar, ChevronRight, ExternalLink, Megaphone, Plus, Tent, Users } from "lucide-react";

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

function getActivityIcon(type: DashboardViewModel["activity"][number]["type"]) {
  switch (type) {
    case "announcement":
      return <Megaphone className="h-4 w-4" />;
    case "event":
      return <Calendar className="h-4 w-4" />;
    default:
      return <ChevronRight className="h-4 w-4" />;
  }
}

function getMetricIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("club")) return <Tent className="h-5 w-5" />;
  if (l.includes("member") || l.includes("roster")) return <Users className="h-5 w-5" />;
  if (l.includes("event")) return <Calendar className="h-5 w-5" />;
  if (l.includes("announcement")) return <Megaphone className="h-5 w-5" />;
  return <ChevronRight className="h-5 w-5" />;
}

export function DashboardOverview({ viewModel }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {viewModel.metrics.map((metric) => (
            <Card
              className="relative overflow-hidden rounded-[1.5rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] sm:p-6 lg:p-8"
              key={metric.label}
            >
              <div className="flex items-center justify-between">
                <Badge variant={getBadgeVariant(metric.tone)}>{metric.label}</Badge>
                <div className="text-muted-foreground/40">{getMetricIcon(metric.label)}</div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {metric.value}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {metric.detail}
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] grayscale">
                <div className="scale-[4]">{getMetricIcon(metric.label)}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="rounded-[1.5rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Recent activity
                </h2>
                <p className="text-sm text-muted-foreground">
                  Latest updates from across your clubs
                </p>
              </div>
            </div>

            {viewModel.activity.length ? (
              <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-muted/50 sm:before:left-4">
                {viewModel.activity.map((item) => (
                  <Link
                    className="group relative ml-7 block rounded-2xl border border-transparent p-3 transition duration-200 hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:ml-10 sm:p-4"
                    href={item.href}
                    key={item.id}
                  >
                    <div className="absolute -left-[2.35rem] top-5 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors group-hover:border-brand/40 group-hover:text-brand sm:-left-[2.75rem] sm:top-6 sm:h-8 sm:w-8">
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
                        {formatDateTime(item.timestamp)}
                      </p>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-foreground group-hover:text-brand transition-colors sm:mt-2 sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </Link>
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
      </div>

      <div className="space-y-8">
        <Card className="rounded-[1.5rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6 lg:p-8 bg-brand/5 border-brand/10">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Quick actions
              </h2>
              <p className="text-sm text-muted-foreground">Common management tasks</p>
            </div>

            <div className="grid gap-3">
              <Button asChild className="justify-start gap-2 h-11" variant="outline">
                <Link href="/clubs">
                  <Plus className="h-4 w-4" />
                  Register new club
                </Link>
              </Button>
              <Button asChild className="justify-start gap-2 h-11" variant="outline">
                <Link href="/members">
                  <Users className="h-4 w-4" />
                  Onboard member
                </Link>
              </Button>
              {viewModel.joinPreviewHref ? (
                <Button asChild className="justify-start gap-2 h-11" variant="secondary">
                  <Link href={viewModel.joinPreviewHref}>
                    <ExternalLink className="h-4 w-4" />
                    Preview join form
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-6 lg:p-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-brand">
              System Status
            </h3>
            <div className="flex items-center gap-3 rounded-xl bg-success/10 p-4 text-success-foreground border border-success/20">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="text-sm font-medium">All systems operational</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connected to PostgreSQL, MongoDB, and Redis backends via the live FastAPI gateway.
            </p>
            <Button asChild className="w-full" size="sm" variant="ghost">
              <Link href="/system/health">View diagnostics</Link>
            </Button>
          </div>
        </Card>

        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

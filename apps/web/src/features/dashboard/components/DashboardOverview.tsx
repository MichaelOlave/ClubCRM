import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
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

function getActivityLabel(type: DashboardViewModel["activity"][number]["type"]) {
  switch (type) {
    case "announcement":
      return "Announcement";
    case "event":
      return "Event";
    default:
      return "Activity";
  }
}

export function DashboardOverview({ viewModel }: Props) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">
              Recent activity
            </p>
            <h2 className="text-2xl font-semibold text-foreground">What changed lately</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              A rolling snapshot of club announcements and scheduled events from the live API.
            </p>
          </div>

          {viewModel.activity.length ? (
            <div className="space-y-4">
              {viewModel.activity.map((item) => (
                <Link
                  className="block rounded-[1.25rem] border border-border p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={item.href}
                  key={item.id}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="muted">{getActivityLabel(item.type)}</Badge>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
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
  );
}

import type { DashboardViewModel } from "@/features/dashboard/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast } from "@/components/ui/Toast";
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
      <Toast>
        This dashboard is using mock-backed server loaders so we can validate the route, shell, and
        reusable component structure before the CRUD API lands.
      </Toast>

      <div className="grid gap-4 lg:grid-cols-3">
        {viewModel.metrics.map((metric) => (
          <Card className="space-y-4" key={metric.label}>
            <Badge variant={getBadgeVariant(metric.tone)}>{metric.label}</Badge>
            <div className="space-y-2">
              <p className="text-4xl font-semibold tracking-tight text-zinc-950">{metric.value}</p>
              <p className="text-sm leading-6 text-zinc-600">{metric.detail}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-700">
                Recent activity
              </p>
              <h2 className="text-2xl font-semibold text-zinc-950">What changed lately</h2>
            </div>

            {viewModel.activity.length ? (
              <div className="space-y-4">
                {viewModel.activity.map((item) => (
                  <div className="rounded-[1.25rem] border border-zinc-200 p-4" key={item.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="muted">{getActivityLabel(item.type)}</Badge>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {formatDateTime(item.timestamp)}
                      </p>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-zinc-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="As the backend starts publishing real events, this list can turn into a live activity feed."
                title="No activity yet"
              />
            )}
          </div>
        </Card>

        <Card tone="subtle">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-700">
                Quick actions
              </p>
              <h2 className="text-2xl font-semibold text-zinc-950">Jump into the MVP routes</h2>
            </div>

            <div className="space-y-4">
              {viewModel.quickActions.map((action) => (
                <div
                  className="rounded-[1.25rem] border border-amber-200 bg-white/70 p-4"
                  key={action.href}
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-950">{action.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{action.description}</p>
                    </div>
                    <Button href={action.href} variant="secondary">
                      Open route
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

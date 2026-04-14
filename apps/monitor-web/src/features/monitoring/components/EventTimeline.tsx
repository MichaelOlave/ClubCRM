import type { MonitoringEvent } from "@/features/monitoring/types";

type Props = {
  events: MonitoringEvent[];
};

export function EventTimeline({ events }: Props) {
  return (
    <section className="monitor-card px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">Timeline</div>
          <h2 className="mt-2 text-2xl font-semibold">Recent events</h2>
        </div>
        <div className="text-sm text-muted-foreground">{events.length} retained entries</div>
      </div>
      <div className="mt-6 space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <article
              key={event.id}
              className="grid gap-2 rounded-[1.75rem] border border-border/70 bg-accent/70 px-4 py-4 md:grid-cols-[auto_1fr]"
            >
              <div
                className={`h-3 w-3 rounded-full ${
                  event.severity === "critical"
                    ? "bg-critical"
                    : event.severity === "warning"
                      ? "bg-warning"
                      : "bg-primary"
                }`}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">{event.message}</span>
                  <span className="monitor-label">{event.kind}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            Events will appear here as synthetic checks, VM controls, and workload changes arrive.
          </div>
        )}
      </div>
    </section>
  );
}

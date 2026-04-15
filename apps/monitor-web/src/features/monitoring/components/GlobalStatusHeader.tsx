import type { MonitoringService } from "@/features/monitoring/types";

type Props = {
  service: MonitoringService;
  generatedAt: string;
  streamStatus: "connecting" | "live" | "reconnecting" | "offline";
  actionError: string | null;
};

function formatTimestamp(value: string) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function GlobalStatusHeader({ actionError, generatedAt, service, streamStatus }: Props) {
  const statusTone =
    service.status === "up"
      ? "text-success border-success/35 bg-success/12"
      : "text-critical border-critical/35 bg-critical/12";
  const latestLatency = service.latest?.latency_ms
    ? `${service.latest.latency_ms.toFixed(0)} ms`
    : "No sample";

  return (
    <section className="monitor-card overflow-hidden">
      <div className="grid gap-6 border-b border-border/70 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <span className="monitor-label">System status</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusTone}`}>
              Service {service.status === "up" ? "healthy" : "degraded"}
            </div>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Stream {streamStatus}
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Synthetic uptime, VM health, container state, and cluster activity are updated from the
            companion monitoring API every second.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Rolling uptime" value={`${service.uptime_percentage.toFixed(2)}%`} />
          <MetricCard label="Latest latency" value={latestLatency} />
          <MetricCard label="Updated" value={formatTimestamp(generatedAt)} />
        </div>
      </div>
      {actionError ? (
        <div className="border-t border-critical/30 bg-critical/10 px-6 py-3 text-sm text-critical">
          {actionError}
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-accent/70 px-4 py-4">
      <div className="monitor-label">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

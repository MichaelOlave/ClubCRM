import type { MonitoringContainer } from "@/features/monitoring/types";

type Props = {
  containers: Record<string, MonitoringContainer[]>;
};

export function DockerPanel({ containers }: Props) {
  const entries = Object.entries(containers);

  return (
    <section className="monitor-card px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">Docker</div>
          <h2 className="mt-2 text-2xl font-semibold">Container status grid</h2>
        </div>
        <div className="text-sm text-muted-foreground">{entries.length} VM groups</div>
      </div>
      <div className="mt-6 space-y-4">
        {entries.map(([vmId, vmContainers]) => (
          <article key={vmId} className="rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {vmId}
              </h3>
              <span className="text-xs text-muted-foreground">{vmContainers.length} containers</span>
            </div>
            <div className="grid gap-2">
              {vmContainers.length > 0 ? (
                vmContainers.map((container) => (
                  <div
                    key={`${vmId}-${container.name}`}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                  >
                    <div>
                      <div className="font-medium">{container.name}</div>
                      <div className="text-xs text-muted-foreground">{container.image ?? "image unknown"}</div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        container.status === "running"
                          ? "bg-success/15 text-success"
                          : "bg-critical/15 text-critical"
                      }`}
                    >
                      {container.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                  No container telemetry reported yet.
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

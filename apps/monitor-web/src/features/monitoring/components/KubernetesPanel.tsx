import type { MonitoringSnapshot } from "@/features/monitoring/types";

type Props = {
  kubernetes: MonitoringSnapshot["kubernetes"];
};

export function KubernetesPanel({ kubernetes }: Props) {
  const visiblePods = kubernetes.pods.slice(0, 8);

  return (
    <section className="monitor-card px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">Kubernetes</div>
          <h2 className="mt-2 text-2xl font-semibold">Nodes and pods</h2>
        </div>
        <div className="rounded-full border border-border/70 bg-accent/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {kubernetes.connected ? kubernetes.source : "not connected"}
        </div>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[0.75fr_1.25fr] xl:items-start">
        <article className="self-start rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
          <h3 className="monitor-label">Nodes</h3>
          <div className="mt-3 space-y-2">
            {kubernetes.nodes.length > 0 ? (
              kubernetes.nodes.map((node) => (
                <div
                  key={node.name}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                >
                  <span className="font-medium">{node.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      node.status === "Ready"
                        ? "bg-success/15 text-success"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                No node snapshot available.
              </div>
            )}
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="monitor-label">Pods</h3>
            <div className="text-xs text-muted-foreground">
              {visiblePods.length} shown
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {visiblePods.length > 0 ? (
              visiblePods.map((pod) => (
                <div
                  key={`${pod.namespace}-${pod.name}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/45 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="break-words font-medium leading-6">{pod.name}</div>
                    <div className="text-xs leading-5 text-muted-foreground">
                      {pod.namespace}
                      {pod.node_name ? ` • ${pod.node_name}` : ""}
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      pod.status === "Running"
                        ? "bg-success/15 text-success"
                        : pod.status === "CrashLoopBackOff"
                          ? "bg-critical/15 text-critical"
                          : "bg-warning/15 text-warning"
                    }`}
                  >
                    {pod.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                No pod snapshot available.
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

import type { MonitoringSnapshot } from "@/features/monitoring/types";

type Props = {
  kubernetes: MonitoringSnapshot["kubernetes"];
};

function renderStatusTone(status: string, positiveValues: string[]) {
  return positiveValues.includes(status.toLowerCase())
    ? "bg-success/15 text-success"
    : "bg-warning/15 text-warning";
}

export function StoragePanel({ kubernetes }: Props) {
  return (
    <section className="monitor-card px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">Storage</div>
          <h2 className="mt-2 text-2xl font-semibold">PVCs and Longhorn volumes</h2>
        </div>
        <div className="rounded-full border border-border/70 bg-accent/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {kubernetes.storage_classes.length} classes • {kubernetes.pvcs.length} PVCs
        </div>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
          <h3 className="monitor-label">Storage Classes</h3>
          <div className="mt-3 space-y-2">
            {kubernetes.storage_classes.length > 0 ? (
              kubernetes.storage_classes.map((storageClass) => (
                <div
                  key={storageClass.name}
                  className="rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{storageClass.name}</div>
                    {storageClass.is_default ? (
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                        default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {storageClass.provisioner}
                    {storageClass.volume_binding_mode
                      ? ` • ${storageClass.volume_binding_mode}`
                      : ""}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                No storage class snapshot available.
              </div>
            )}
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
          <h3 className="monitor-label">Persistent Volume Claims</h3>
          <div className="mt-3 space-y-2">
            {kubernetes.pvcs.length > 0 ? (
              kubernetes.pvcs.slice(0, 6).map((pvc) => (
                <div
                  key={`${pvc.namespace}-${pvc.name}`}
                  className="rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{pvc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pvc.namespace}
                        {pvc.storage_class_name ? ` • ${pvc.storage_class_name}` : ""}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${renderStatusTone(
                        pvc.status,
                        ["bound"]
                      )}`}
                    >
                      {pvc.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {pvc.requested_storage ?? "size unavailable"}
                    {pvc.volume_name ? ` • ${pvc.volume_name}` : ""}
                    {pvc.volume_status ? ` • PV ${pvc.volume_status}` : ""}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                No PVC snapshot available.
              </div>
            )}
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-border/70 bg-accent/75 p-4">
          <h3 className="monitor-label">Longhorn Volumes</h3>
          <div className="mt-3 space-y-2">
            {kubernetes.longhorn_volumes.length > 0 ? (
              kubernetes.longhorn_volumes.slice(0, 6).map((volume) => (
                <div
                  key={`${volume.namespace}-${volume.name}`}
                  className="rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{volume.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {volume.state}
                        {volume.node_id ? ` • ${volume.node_id}` : ""}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${renderStatusTone(
                        volume.robustness,
                        ["healthy"]
                      )}`}
                    >
                      {volume.robustness}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {volume.size ?? "size unavailable"}
                    {!volume.ready ? " • attention needed" : ""}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                No Longhorn volume snapshot available.
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

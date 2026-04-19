import type { MonitoringVm } from "@/features/monitoring/types";

type Props = {
  vms: MonitoringVm[];
  pendingActions: Record<string, boolean>;
  variant?: "default" | "compact";
  onVmPowerAction: (vmId: string, action: "start" | "stop" | "restart") => void;
};

export function VmPanel({ vms, pendingActions, variant = "default", onVmPowerAction }: Props) {
  const isCompact = variant === "compact";

  return (
    <section className={`monitor-card ${isCompact ? "h-full px-5 py-5" : "px-6 py-6"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">VM fleet</div>
          <h2 className={`mt-2 font-semibold ${isCompact ? "text-xl" : "text-2xl"}`}>
            Host health and power state
          </h2>
        </div>
        <div className="text-sm text-muted-foreground">{vms.length} tracked VMs</div>
      </div>
      <div className={`mt-6 grid gap-4 ${isCompact ? "grid-cols-1" : "xl:grid-cols-3"}`}>
        {vms.map((vm) => {
          const isVmActionPending = (["start", "stop", "restart"] as const).some(
            (action) => pendingActions[`vm:${vm.id}:${action}`]
          );

          return (
            <article
              key={vm.id}
              className={`rounded-[1.75rem] border border-border/70 bg-accent/75 ${
                isCompact ? "p-4" : "p-5"
              } ${isVmActionPending ? "ring-1 ring-primary/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{vm.id}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    power {vm.power_state} / agent {vm.agent_status}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isVmActionPending ? (
                    <div className="flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      <StatusRing />
                      Command running
                    </div>
                  ) : null}
                  <StatusPill
                    label={vm.power_state}
                    tone={
                      vm.power_state === "running"
                        ? "success"
                        : vm.power_state === "stopped"
                          ? "warning"
                          : "critical"
                    }
                  />
                  <StatusPill
                    label={`agent ${vm.agent_status}`}
                    tone={
                      vm.agent_status === "online"
                        ? "success"
                        : vm.agent_status === "stale"
                          ? "warning"
                          : "critical"
                    }
                  />
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <MetricBar
                  label="CPU"
                  value={vm.power_state === "running" ? vm.cpu_percent : 0}
                  valueLabel={
                    vm.power_state === "running" ? `${vm.cpu_percent.toFixed(0)}%` : "Stopped"
                  }
                />
                <MetricBar
                  label="RAM"
                  value={vm.power_state === "running" ? vm.memory_percent : 0}
                  valueLabel={
                    vm.power_state === "running" ? `${vm.memory_percent.toFixed(0)}%` : "Stopped"
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(["start", "stop", "restart"] as const).map((action) => {
                  const actionKey = `vm:${vm.id}:${action}`;
                  const isPending = Boolean(pendingActions[actionKey]);
                  return (
                    <button
                      key={action}
                      aria-label={`${action} ${vm.id}`}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isVmActionPending}
                      onClick={() => onVmPowerAction(vm.id, action)}
                    >
                      {isPending ? <StatusRing /> : null}
                      {isPending ? `${toActionProgressLabel(action)}...` : action}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MetricBar({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value: number;
  valueLabel?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="monitor-label">{label}</span>
        <span>{valueLabel ?? `${value.toFixed(0)}%`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-background/70">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,oklch(0.77_0.14_205),oklch(0.82_0.16_84))]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "warning" | "critical" }) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-critical/15 text-critical";

  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}
    >
      {label}
    </div>
  );
}

function StatusRing() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
  );
}

function toActionProgressLabel(action: "start" | "stop" | "restart") {
  if (action === "stop") {
    return "stopping";
  }

  return `${action}ing`;
}

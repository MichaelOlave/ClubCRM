import type { ReactNode } from "react";
import type {
  ActiveWebPodTarget,
  ResolvedDemoFailoverTarget,
} from "@/features/monitoring/lib/demo";
import type { MonitoringSnapshot } from "@/features/monitoring/types";

type Props = {
  activeWebPodTarget: ActiveWebPodTarget | null;
  failoverTarget: ResolvedDemoFailoverTarget;
  pendingActions: Record<string, boolean>;
  snapshot: MonitoringSnapshot;
  streamStatus: "connecting" | "live" | "reconnecting" | "offline";
  onStartFailover: () => void;
};

export function DemoFlowRail({
  activeWebPodTarget,
  failoverTarget,
  pendingActions,
  snapshot,
  streamStatus,
  onStartFailover,
}: Props) {
  const demo = snapshot.demo ?? {
    failover_target: null,
    node_vm_map: {},
    ready_node_names: [],
    healthy_vm_count: 0,
    running_web_pods: [],
    standby_node_names: [],
  };
  const activeWebPods =
    demo.running_web_pods.length > 0
      ? demo.running_web_pods
      : snapshot.kubernetes.pods
          .filter((pod) => pod.namespace === "clubcrm" && pod.name.startsWith("clubcrm-web"))
          .map((pod) => ({
            namespace: pod.namespace,
            name: pod.name,
            status: pod.status,
            node_name: pod.node_name,
            vm_id: null,
          }));
  const readyNodeNames =
    demo.ready_node_names.length > 0
      ? demo.ready_node_names
      : snapshot.kubernetes.nodes
          .filter((node) => node.status === "Ready")
          .map((node) => node.name);
  const sshReachableVmCount = snapshot.vms.filter((vm) => vm.power_state === "running").length;
  const healthyVmCount =
    demo.healthy_vm_count > 0
      ? demo.healthy_vm_count
      : snapshot.vms.filter((vm) => vm.power_state === "running" && vm.agent_status === "online")
          .length;
  const activeRestartActionKey = failoverTarget.vmId ? `vm:${failoverTarget.vmId}:restart` : null;
  const pendingVmActions = Object.keys(pendingActions).filter((actionKey) =>
    actionKey.startsWith("vm:")
  );
  const pendingPodActions = Object.keys(pendingActions).filter((actionKey) =>
    actionKey.startsWith("pod:")
  );
  const activeNodeName = failoverTarget.nodeName?.toLowerCase() ?? null;
  const standbyNodeTargets = (
    demo.standby_node_names.length > 0
      ? demo.standby_node_names
      : readyNodeNames.length > 0
        ? readyNodeNames
        : snapshot.vms
            .filter((vm) => vm.power_state === "running")
            .map((vm) => vm.id.trim().toLowerCase())
  ).filter((nodeName) => nodeName.toLowerCase() !== activeNodeName);
  const isStartButtonPending = activeRestartActionKey
    ? Boolean(pendingActions[activeRestartActionKey])
    : false;
  const isRestartInFlight =
    pendingVmActions.length > 0 ||
    pendingPodActions.length > 0 ||
    activeWebPods.some((pod) => pod.status !== "Running") ||
    snapshot.vms.some((vm) => vm.pending_commands > 0);
  const liveActiveServer = activeWebPodTarget?.nodeName ?? failoverTarget.nodeName ?? null;
  const liveActivePod = activeWebPodTarget?.podName ?? failoverTarget.podName ?? null;
  const hasStandbyServer = standbyNodeTargets.length > 0;
  const effectiveHealthyVmCount = healthyVmCount > 0 ? healthyVmCount : sshReachableVmCount;
  const hasHealthyVmCapacity = effectiveHealthyVmCount >= 2;
  const hasActiveRoute = Boolean(failoverTarget.vmId) && Boolean(failoverTarget.nodeName);
  const liveRouteReachable = snapshot.service.status === "up";
  const streamHealthy = streamStatus === "live";
  const preflightItems = [
    {
      label: "Live route reachable",
      detail: liveRouteReachable
        ? "Synthetic route check is passing."
        : "Synthetic route is not healthy yet.",
      ok: liveRouteReachable,
    },
    {
      label: "Monitoring stream live",
      detail:
        streamHealthy || streamStatus === "connecting"
          ? "Presenter console is receiving live snapshots."
          : "WebSocket stream is reconnecting or offline.",
      ok: streamHealthy,
    },
    {
      label: "Active server detected",
      detail: hasActiveRoute
        ? `${failoverTarget.vmId} is the current active server.`
        : "Waiting for the active ClubCRM server snapshot.",
      ok: hasActiveRoute,
    },
    {
      label: "Standby capacity available",
      detail: hasStandbyServer
        ? `Standby server${standbyNodeTargets.length === 1 ? "" : "s"}: ${standbyNodeTargets.join(", ")}.`
        : snapshot.vms.some((vm) => vm.power_state === "running")
          ? "No standby server is confirmed from Kubernetes yet, but SSH-visible running servers are being used as the fallback readiness signal."
          : "No standby server is ready to receive traffic yet.",
      ok: hasStandbyServer,
    },
    {
      label: "Healthy VM capacity",
      detail:
        healthyVmCount > 0
          ? `${healthyVmCount}/${snapshot.vms.length || 0} server agents healthy.`
          : `${effectiveHealthyVmCount}/${snapshot.vms.length || 0} servers reachable through the SSH control path.`,
      ok: hasHealthyVmCapacity,
    },
  ];
  const isDemoReady = preflightItems.every((item) => item.ok);
  const startButtonDisabled = !isDemoReady || isStartButtonPending;
  const startButtonLabel = isStartButtonPending
    ? "Starting server failover..."
    : "Run server failover demo";
  const startButtonCaption = !hasActiveRoute
    ? "Waiting for the active server snapshot."
    : !isDemoReady
      ? "Resolve the preflight warnings above before running the live failover presentation."
      : `Canonical trigger: restart ${failoverTarget.vmId}${failoverTarget.nodeName ? ` via ${failoverTarget.nodeName}` : ""}.`;
  const restartStatusLabel = isRestartInFlight ? "Disruption observed" : "Standing by";
  const restartStatusDetail = isRestartInFlight
    ? "The control plane sees an in-flight VM or pod action. Keep the audience screen visible while traffic settles on a healthy replacement server."
    : "No failover is running yet. Start the canonical server failover here, then let the public audience screen tell the recovery story.";
  const visiblePodServerCount =
    new Set(activeWebPods.map((pod) => pod.node_name).filter(Boolean)).size || 0;
  const targetDetail = liveActiveServer
    ? liveActivePod
      ? `Live route currently lands on ${liveActiveServer} via pod ${liveActivePod}. Kubernetes visibility still sees ${activeWebPods.length} running web pod${activeWebPods.length === 1 ? "" : "s"} across ${visiblePodServerCount || 1} server${visiblePodServerCount === 1 ? "" : "s"}.`
      : `Live route currently lands on ${liveActiveServer}. Kubernetes visibility still sees ${activeWebPods.length} running web pod${activeWebPods.length === 1 ? "" : "s"} across ${visiblePodServerCount || 1} server${visiblePodServerCount === 1 ? "" : "s"}.`
    : activeWebPods.length > 0
      ? `${activeWebPods.length} running web pod${activeWebPods.length === 1 ? "" : "s"} across ${visiblePodServerCount || 1} visible server${visiblePodServerCount === 1 ? "" : "s"}.`
      : "No running ClubCRM web pod is visible yet.";

  return (
    <div className="rounded-[1.75rem] border border-primary/30 bg-[linear-gradient(135deg,oklch(0.31_0.05_221/0.92),oklch(0.24_0.03_228/0.98))] px-4 py-5 shadow-[0_18px_40px_rgba(4,10,24,0.22)] lg:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="monitor-label text-primary">Presenter console</p>
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">
            Run the canonical server failover demo, then follow the recovery on the audience screen.
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This rail keeps the presenter focused on readiness, the server restart trigger, and the
            route handoff. The public ClubCRM page still offers a fallback pod recycle flow, but the
            networking presentation should start here in monitor-web.
          </p>
        </div>
        <div className="rounded-full border border-primary/30 bg-background/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Canonical trigger path
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-background/20 px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="monitor-label text-primary">Preflight</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the live route, stream health, and standby capacity before you restart the
              active ClubCRM server on stage.
            </p>
          </div>
          <div
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              isDemoReady
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning-foreground"
            }`}
          >
            {isDemoReady ? "Demo ready" : "Preflight required"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {preflightItems.map((item) => (
            <article
              key={item.label}
              className={`rounded-[1.2rem] border px-4 py-3 transition-colors ${
                item.ok ? "border-success/25 bg-success/10" : "border-warning/25 bg-warning/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1 h-3 w-3 rounded-full ${
                    item.ok ? "bg-success" : "bg-warning animate-pulse"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <DemoFlowCard
          description="Kick off the networking presentation from here. This is the canonical trigger path for the live demo and intentionally restarts the active ClubCRM server."
          eyebrow="Step 1"
          title="Trigger failover"
          tone={isDemoReady ? "active" : "warning"}
        >
          <button
            className="inline-flex items-center justify-center rounded-full border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={startButtonDisabled}
            onClick={onStartFailover}
            type="button"
          >
            {startButtonLabel}
          </button>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {startButtonCaption}
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={`Ready servers: ${readyNodeNames.join(", ") || "No ready nodes reported."}`}
          eyebrow="Step 2"
          title="Standby capacity"
          tone={hasStandbyServer && hasHealthyVmCapacity ? "success" : "warning"}
        >
          <div className="space-y-2">
            <div className="text-3xl font-semibold text-foreground">
              {readyNodeNames.length}/{snapshot.kubernetes.nodes.length || 0}
            </div>
            <div className="text-sm font-medium text-muted-foreground">servers ready</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {healthyVmCount > 0
                ? `${healthyVmCount}/${snapshot.vms.length || 0} server agents healthy`
                : `${effectiveHealthyVmCount}/${snapshot.vms.length || 0} servers reachable over ssh`}
            </div>
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={restartStatusDetail}
          eyebrow="Step 3"
          title="Disruption watch"
          tone={isRestartInFlight ? "warning" : "default"}
        >
          <div className="space-y-2">
            <div className="text-base font-semibold text-foreground">{restartStatusLabel}</div>
            <div className="text-sm text-muted-foreground">
              {pendingVmActions.length + pendingPodActions.length} tracked control action
              {pendingVmActions.length + pendingPodActions.length === 1 ? "" : "s"}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {activeWebPods.some((pod) => pod.status !== "Running")
                ? "Route instability visible"
                : "Waiting for disruption"}
            </div>
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={targetDetail}
          eyebrow="Step 4"
          title="Traffic recovered"
          tone={activeWebPods.length > 0 ? "success" : "warning"}
        >
          <div className="space-y-2">
            <div className="text-base font-semibold text-foreground">
              {liveActiveServer ?? "No active server"}
            </div>
            <div className="text-sm text-muted-foreground">
              {standbyNodeTargets.length > 0 && liveActiveServer
                ? `Live route on ${liveActiveServer} with standby on ${standbyNodeTargets.join(", ")}`
                : liveActiveServer
                  ? `Live route currently visible on ${liveActiveServer}`
                  : "Waiting for a healthy replacement server"}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {liveActivePod
                ? `Pod ${liveActivePod}`
                : `${activeWebPods.length} running route target${activeWebPods.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </DemoFlowCard>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-background/25 px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="monitor-label">Server status</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Green means the server is up and the VM agent is online. Amber means the presenter
              should hold until the environment is ready for another run.
            </p>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Live failover indicator
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.vms.map((vm) => {
            const isHealthy = vm.power_state === "running" && vm.agent_status === "online";
            const isActiveTarget = failoverTarget.vmId === vm.id;

            return (
              <article
                key={vm.id}
                className={`rounded-[1.25rem] border px-4 py-3 transition-colors ${
                  isHealthy ? "border-success/25 bg-success/10" : "border-warning/25 bg-warning/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 rounded-full ${
                        isHealthy
                          ? "bg-success shadow-[0_0_0_5px_rgba(34,197,94,0.12)]"
                          : "bg-warning shadow-[0_0_0_5px_rgba(245,158,11,0.12)]"
                      }`}
                    />
                    <div>
                      <div className="text-base font-semibold text-foreground">{vm.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {isHealthy ? "Online and serving" : "Unavailable or degraded"}
                      </div>
                    </div>
                  </div>
                  {isActiveTarget ? (
                    <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Active target
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DemoFlowCard({
  children,
  description,
  eyebrow,
  title,
  tone,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  tone: "active" | "success" | "warning" | "default";
}) {
  const toneClasses =
    tone === "active"
      ? "border-primary/45 bg-primary/12"
      : tone === "success"
        ? "border-success/25 bg-success/10"
        : tone === "warning"
          ? "border-warning/25 bg-warning/10"
          : "border-border/70 bg-background/30";

  const dotClasses =
    tone === "active"
      ? "bg-primary"
      : tone === "success"
        ? "bg-success"
        : tone === "warning"
          ? "bg-warning"
          : "bg-muted-foreground";

  return (
    <article
      className={`relative rounded-[1.5rem] border px-4 py-4 transition-colors lg:px-5 ${toneClasses}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${dotClasses}`} />
        <div className="monitor-label">{eyebrow}</div>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="text-base font-semibold text-foreground">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </article>
  );
}

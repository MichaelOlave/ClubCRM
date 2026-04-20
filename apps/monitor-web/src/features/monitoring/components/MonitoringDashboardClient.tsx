"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ControlRail } from "@/features/monitoring/components/ControlRail";
import { DockerPanel } from "@/features/monitoring/components/DockerPanel";
import { EventTimeline } from "@/features/monitoring/components/EventTimeline";
import { GlobalStatusHeader } from "@/features/monitoring/components/GlobalStatusHeader";
import { KubernetesPanel } from "@/features/monitoring/components/KubernetesPanel";
import { LatencyChart } from "@/features/monitoring/components/LatencyChart";
import { LiveClubcrmFrame } from "@/features/monitoring/components/LiveClubcrmFrame";
import { StoragePanel } from "@/features/monitoring/components/StoragePanel";
import { VmPanel } from "@/features/monitoring/components/VmPanel";
import { useMonitoringStream } from "@/features/monitoring/hooks/useMonitoringStream";
import type {
  MonitoringKubernetesNode,
  MonitoringKubernetesPod,
  MonitoringSnapshot,
  MonitoringVm,
} from "@/features/monitoring/types";

type Props = {
  initialSnapshot: MonitoringSnapshot;
  initialControlModeUnlocked: boolean;
  streamUrl: string;
  demoUrl: string;
};

type DashboardTabId = "overview" | "infrastructure" | "controls";
type DashboardMode = "control" | "demo";

const DASHBOARD_MODE_STORAGE_KEY = "clubcrm-control-dashboard-mode";

type PendingConfirmation = {
  actionKey: string;
  message: string;
  request: () => Promise<Response>;
  onSuccess?: (payload: Record<string, unknown>) => Promise<void>;
};

type ActiveWebPodTarget = {
  instanceId: string;
  podName: string | null;
  namespace: string | null;
  nodeName: string | null;
};

export function MonitoringDashboardClient({
  demoUrl,
  initialControlModeUnlocked,
  initialSnapshot,
  streamUrl,
}: Props) {
  const { replaceSnapshot, snapshot, streamStatus } = useMonitoringStream(
    initialSnapshot,
    streamUrl
  );
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>(
    initialControlModeUnlocked ? "control" : "demo"
  );
  const [isControlModeUnlocked, setIsControlModeUnlocked] = useState(initialControlModeUnlocked);
  const [isUnlockingControlMode, setIsUnlockingControlMode] = useState(false);
  const [controlModePassword, setControlModePassword] = useState("");
  const [controlModeError, setControlModeError] = useState<string | null>(null);
  const [showControlModePrompt, setShowControlModePrompt] = useState(false);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>(
    initialControlModeUnlocked ? "overview" : "controls"
  );
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [activeWebPodTarget, setActiveWebPodTarget] = useState<ActiveWebPodTarget | null>(null);
  const isDemoMode = dashboardMode === "demo";
  const tabs = useMemo(
    () =>
      isDemoMode
        ? [
            {
              id: "controls" as const,
              label: "Demo",
              description: "Live failover view and event feed for presentation mode.",
              badge: "Presentation",
            },
          ]
        : [
            {
              id: "overview" as const,
              label: "Overview",
              description: "Service latency, recent activity, and VM health in one place.",
              badge: "Live",
            },
            {
              id: "infrastructure" as const,
              label: "Infrastructure",
              description: "Container, Kubernetes, and storage signals grouped by platform layer.",
              badge: "Cluster",
            },
            {
              id: "controls" as const,
              label: "Controls",
              description:
                "Guarded control actions and event history for operational recovery work.",
              badge: "Actions",
            },
          ],
    [isDemoMode]
  );

  useEffect(() => {
    const storedMode = window.localStorage.getItem(DASHBOARD_MODE_STORAGE_KEY);
    if ((storedMode === "control" || storedMode === "monitor") && initialControlModeUnlocked) {
      setDashboardMode("control");
      setActiveTab("overview");
      return;
    }

    if (storedMode === "demo") {
      setDashboardMode("demo");
      setActiveTab("controls");
    }
  }, [initialControlModeUnlocked]);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_MODE_STORAGE_KEY, dashboardMode);
  }, [dashboardMode]);

  useEffect(() => {
    const availableTabIds = new Set(tabs.map((tab) => tab.id));
    if (!availableTabIds.has(activeTab)) {
      setActiveTab(isDemoMode ? "controls" : "overview");
    }

    if (!isDemoMode) {
      setPendingConfirmation(null);
    }
  }, [activeTab, isDemoMode, tabs]);

  async function fetchLatestSnapshot() {
    const response = await fetch("/api/snapshot", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to refresh the monitoring snapshot.");
    }

    return (await response.json()) as MonitoringSnapshot;
  }

  async function refreshSnapshot() {
    const nextSnapshot = await fetchLatestSnapshot();
    replaceSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  async function waitForVmPowerState(
    vmId: string,
    desiredState: MonitoringVm["power_state"],
    timeoutMs = 12000
  ) {
    const deadline = Date.now() + timeoutMs;
    let latestSnapshot: MonitoringSnapshot | null = null;

    while (Date.now() <= deadline) {
      latestSnapshot = await refreshSnapshot();
      const vm = latestSnapshot.vms.find((candidate) => candidate.id === vmId);

      if (vm?.power_state === desiredState) {
        return vm;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }

    throw new Error(`${vmId} did not report ${desiredState} before the command timed out.`);
  }

  function queueActionConfirmation(
    actionKey: string,
    confirmationMessage: string,
    request: () => Promise<Response>,
    onSuccess?: (payload: Record<string, unknown>) => Promise<void>
  ) {
    if (pendingConfirmation || pendingActions[actionKey]) {
      return;
    }

    setPendingConfirmation({
      actionKey,
      message: confirmationMessage,
      request,
      onSuccess,
    });
  }

  async function executeConfirmedAction() {
    if (!pendingConfirmation) {
      return;
    }

    const { actionKey, onSuccess, request } = pendingConfirmation;
    setPendingConfirmation(null);
    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    setActionError(null);

    try {
      const response = await request();
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
      } & Record<string, unknown>;
      if (!response.ok) {
        throw new Error(payload.detail ?? "Monitoring control action failed.");
      }

      if (onSuccess) {
        await onSuccess(payload);
      } else {
        await refreshSnapshot();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Monitoring control action failed.");
    } finally {
      setPendingActions((current) => {
        const nextState = { ...current };
        delete nextState[actionKey];
        return nextState;
      });
    }
  }

  function handleVmPowerAction(vmId: string, action: "start" | "stop" | "restart") {
    queueActionConfirmation(
      `vm:${vmId}:${action}`,
      `Confirm ${action} for ${vmId}?`,
      () =>
        fetch(`/api/control/vms/${vmId}/power`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      async () => {
        await waitForVmPowerState(vmId, action === "stop" ? "stopped" : "running");
      }
    );
  }

  function handleContainerAction(
    vmId: string,
    containerName: string,
    action: "start" | "stop" | "restart"
  ) {
    queueActionConfirmation(
      `container:${vmId}:${containerName}:${action}`,
      `Confirm ${action} for container ${containerName} on ${vmId}?`,
      () =>
        fetch(`/api/control/containers/${vmId}/${containerName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
    );
  }

  function handlePodRecycle(namespace: string, podName: string) {
    queueActionConfirmation(
      `pod:${namespace}:${podName}:recycle`,
      `Recycle ${namespace}/${podName}?`,
      () =>
        fetch(`/api/control/k8s/pods/${namespace}/${podName}/recycle`, {
          method: "POST",
        })
    );
  }

  async function handleDemoFlowStart() {
    const fallbackWebPod =
      snapshot.kubernetes.pods.find(
        (pod) =>
          pod.namespace === "clubcrm" &&
          pod.name.startsWith("clubcrm-web") &&
          pod.status === "Running"
      ) ??
      snapshot.kubernetes.pods.find(
        (pod) => pod.namespace === "clubcrm" && pod.name.startsWith("clubcrm-web")
      ) ??
      null;
    const targetNamespace = activeWebPodTarget?.namespace ?? fallbackWebPod?.namespace ?? "clubcrm";
    const targetPodName = activeWebPodTarget?.podName ?? fallbackWebPod?.name ?? null;

    if (!targetPodName) {
      setActionError("No active ClubCRM web pod is available to recycle yet.");
      return;
    }

    const actionKey = `pod:${targetNamespace}:${targetPodName}:recycle`;
    if (pendingActions[actionKey]) {
      return;
    }

    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    setActionError(null);

    try {
      const response = await fetch(
        `/api/control/k8s/pods/${targetNamespace}/${targetPodName}/recycle`,
        { method: "POST" }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
      } & Record<string, unknown>;

      if (!response.ok) {
        throw new Error(payload.detail ?? "Unable to start the failover flow.");
      }

      await refreshSnapshot();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to start the failover flow.");
    } finally {
      setPendingActions((current) => {
        const nextState = { ...current };
        delete nextState[actionKey];
        return nextState;
      });
    }
  }

  async function unlockControlMode() {
    if (isControlModeUnlocked) {
      setDashboardMode("control");
      setActiveTab("overview");
      return;
    }

    setIsUnlockingControlMode(true);
    setControlModeError(null);

    try {
      const response = await fetch("/api/monitor-mode-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: controlModePassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };

      if (!response.ok) {
        throw new Error(payload.detail ?? "Unable to unlock control mode.");
      }

      setIsControlModeUnlocked(true);
      setDashboardMode("control");
      setActiveTab("overview");
      setControlModePassword("");
      setShowControlModePrompt(false);
    } catch (error) {
      setControlModeError(
        error instanceof Error ? error.message : "Unable to unlock control mode."
      );
    } finally {
      setIsUnlockingControlMode(false);
    }
  }

  function handleControlModeRequest() {
    if (isControlModeUnlocked) {
      setDashboardMode("control");
      setActiveTab("overview");
      return;
    }

    setControlModeError(null);
    setShowControlModePrompt(true);
  }

  return (
    <div className="space-y-6 pb-10">
      <ControlModePasswordModal
        errorMessage={controlModeError}
        isOpen={showControlModePrompt}
        isSubmitting={isUnlockingControlMode}
        password={controlModePassword}
        onCancel={() => {
          setControlModePassword("");
          setControlModeError(null);
          setShowControlModePrompt(false);
        }}
        onPasswordChange={setControlModePassword}
        onSubmit={() => void unlockControlMode()}
      />
      <ActionConfirmationModal
        confirmation={pendingConfirmation}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => void executeConfirmedAction()}
      />
      <GlobalStatusHeader
        actionError={actionError}
        generatedAt={snapshot.generated_at}
        service={snapshot.service}
        streamStatus={streamStatus}
      />
      <section className="monitor-card overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-border/70 px-6 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="monitor-label">Workspace</div>
              <h2 className="text-2xl font-semibold">Organized monitoring views</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Switch between the public-ready demo view and the protected control workspace
                without losing the live stream context.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="inline-flex rounded-full border border-border/70 bg-accent/70 p-1">
                {(
                  [
                    {
                      description:
                        "Show the live failover page without the operational control rail.",
                      label: "Demo mode",
                      value: "demo" as const,
                    },
                    {
                      description:
                        "Show the operational tabs and guarded controls after the password has been verified.",
                      label: "Control mode",
                      value: "control" as const,
                    },
                  ] satisfies Array<{
                    description: string;
                    label: string;
                    value: DashboardMode;
                  }>
                ).map((mode) => {
                  const isActive = dashboardMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      aria-pressed={isActive}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(8,24,50,0.22)]"
                          : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      }`}
                      title={mode.description}
                      type="button"
                      onClick={() =>
                        mode.value === "control"
                          ? handleControlModeRequest()
                          : setDashboardMode("demo")
                      }
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {!isControlModeUnlocked ? (
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Control mode locked
                </div>
              ) : null}
              <div className="rounded-full border border-border/70 bg-accent/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {snapshot.service.history.length} checks in history
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-accent/55 px-4 py-4 text-sm leading-6 text-muted-foreground">
            {isDemoMode
              ? "Demo mode is enabled. This view stays presentation-ready with the embedded failover page and event feed only."
              : "Control mode is enabled. The operational overview, infrastructure, and guarded controls are unlocked for deeper troubleshooting."}
          </div>
          <div className="flex flex-col gap-4">
            <div
              aria-label="Monitoring views"
              className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2"
              role="tablist"
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    id={`monitor-tab-${tab.id}`}
                    aria-controls={`monitor-panel-${tab.id}`}
                    aria-selected={isActive}
                    className={`min-w-[220px] rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-primary/50 bg-primary/12 shadow-[0_12px_30px_rgba(8,24,50,0.18)]"
                        : "border-border/70 bg-accent/60 hover:border-primary/35 hover:bg-accent/80"
                    }`}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-semibold">{tab.label}</span>
                      <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {tab.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {tab.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {isDemoMode ? (
              <DemoFlowRail
                activeWebPodTarget={activeWebPodTarget}
                kubernetesNodes={snapshot.kubernetes.nodes}
                onStartFailover={() => void handleDemoFlowStart()}
                pendingActions={pendingActions}
                pods={snapshot.kubernetes.pods}
                vms={snapshot.vms}
              />
            ) : null}
          </div>
        </div>
        {!isDemoMode && activeTab === "overview" ? (
          <div
            aria-labelledby="monitor-tab-overview"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-overview"
            role="tabpanel"
          >
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <LatencyChart
                history={snapshot.service.history}
                targetUrl={snapshot.service.target_url}
              />
              <VmPanel
                pendingActions={pendingActions}
                showActions={isDemoMode}
                variant="compact"
                vms={snapshot.vms}
                onVmPowerAction={handleVmPowerAction}
              />
            </section>
            <EventTimeline events={snapshot.events} />
          </div>
        ) : null}
        {!isDemoMode && activeTab === "infrastructure" ? (
          <div
            aria-labelledby="monitor-tab-infrastructure"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-infrastructure"
            role="tabpanel"
          >
            <KubernetesPanel kubernetes={snapshot.kubernetes} />
            <StoragePanel kubernetes={snapshot.kubernetes} />
            <DockerPanel containers={snapshot.containers} />
          </div>
        ) : null}
        {isDemoMode && activeTab === "controls" ? (
          <div
            aria-labelledby="monitor-tab-controls"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-controls"
            role="tabpanel"
          >
            <LiveClubcrmFrame demoUrl={demoUrl} onActiveWebPodChange={setActiveWebPodTarget} />
            <EventTimeline events={snapshot.events} />
          </div>
        ) : null}
        {!isDemoMode && activeTab === "controls" ? (
          <div
            aria-labelledby="monitor-tab-controls"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-controls"
            role="tabpanel"
          >
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <ControlRail
                containers={snapshot.containers}
                pendingActions={pendingActions}
                pods={snapshot.kubernetes.pods}
                vms={snapshot.vms}
                onContainerAction={handleContainerAction}
                onPodRecycle={handlePodRecycle}
                onVmPowerAction={handleVmPowerAction}
              />
              <EventTimeline events={snapshot.events} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DemoFlowRail({
  activeWebPodTarget,
  kubernetesNodes,
  onStartFailover,
  pendingActions,
  pods,
  vms,
}: {
  activeWebPodTarget: ActiveWebPodTarget | null;
  kubernetesNodes: MonitoringKubernetesNode[];
  onStartFailover: () => void;
  pendingActions: Record<string, boolean>;
  pods: MonitoringKubernetesPod[];
  vms: MonitoringVm[];
}) {
  const readyNodes = kubernetesNodes.filter((node) => node.status === "Ready");
  const activeWebPods = pods.filter((pod) => pod.name.includes("clubcrm-web"));
  const runningWebPods = activeWebPods.filter((pod) => pod.status === "Running");
  const replacementTargets = runningWebPods
    .map((pod) => pod.node_name)
    .filter((nodeName): nodeName is string => Boolean(nodeName));
  const uniqueReplacementTargets = Array.from(new Set(replacementTargets));
  const targetNamespace =
    activeWebPodTarget?.namespace ??
    runningWebPods[0]?.namespace ??
    activeWebPods[0]?.namespace ??
    "clubcrm";
  const targetPodName =
    activeWebPodTarget?.podName ?? runningWebPods[0]?.name ?? activeWebPods[0]?.name ?? null;
  const activeRecycleActionKey = targetPodName
    ? `pod:${targetNamespace}:${targetPodName}:recycle`
    : null;
  const pendingVmActions = Object.keys(pendingActions).filter((actionKey) =>
    actionKey.startsWith("vm:")
  );
  const pendingPodActions = Object.keys(pendingActions).filter((actionKey) =>
    actionKey.startsWith("pod:")
  );
  const isStartButtonPending = activeRecycleActionKey
    ? Boolean(pendingActions[activeRecycleActionKey])
    : false;
  const isRestartInFlight =
    pendingVmActions.length > 0 ||
    pendingPodActions.length > 0 ||
    activeWebPods.some((pod) => pod.status !== "Running") ||
    vms.some((vm) => vm.pending_commands > 0);
  const healthyVmCount = vms.filter(
    (vm) => vm.power_state === "running" && vm.agent_status === "online"
  ).length;
  const restartStatusLabel = isRestartInFlight ? "Restart activity detected" : "Standing by";
  const restartStatusDetail = isRestartInFlight
    ? "The monitor sees an in-flight power or pod action. Keep the failover panel open while routing settles on a healthy replacement node."
    : "No recycle is running yet. Start from the button, then watch the live panel while the current web pod is recycled and traffic shifts.";
  const targetDetail =
    runningWebPods.length > 0
      ? `${runningWebPods.length} running web pod${runningWebPods.length === 1 ? "" : "s"} across ${uniqueReplacementTargets.length || 1} healthy node${uniqueReplacementTargets.length === 1 ? "" : "s"}.`
      : "No running ClubCRM web pod is visible yet.";

  return (
    <div className="rounded-[1.75rem] border border-primary/30 bg-[linear-gradient(135deg,oklch(0.31_0.05_221/0.92),oklch(0.24_0.03_228/0.98))] px-4 py-5 shadow-[0_18px_40px_rgba(4,10,24,0.22)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="monitor-label text-primary">Run the demo</p>
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">
            Follow the failover flow from start to healthy-node handoff.
          </h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This sequence starts the guided run, shows live node health, watches restart activity,
            and points at the nodes currently carrying the ClubCRM web pod after failover.
          </p>
        </div>
        <div className="rounded-full border border-primary/30 bg-background/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Presentation flow
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        <DemoFlowCard
          description="Kick off the guided run from here. This action recycles the current ClubCRM web pod so the live failover panel can show traffic moving to a healthy replacement."
          eyebrow="Step 1"
          title="Start demo"
          tone="active"
        >
          <button
            className="inline-flex items-center justify-center rounded-full border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!targetPodName || isStartButtonPending}
            onClick={onStartFailover}
            type="button"
          >
            {isStartButtonPending ? "Starting failover..." : "Start failover run"}
          </button>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {targetPodName
              ? `Targeting ${targetNamespace}/${targetPodName}`
              : "Waiting for the active web pod snapshot"}
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={`Healthy nodes: ${readyNodes.map((node) => node.name).join(", ") || "No ready nodes reported."}`}
          eyebrow="Step 2"
          title="Node health"
          tone={readyNodes.length > 0 ? "success" : "warning"}
        >
          <div className="space-y-2">
            <div className="text-3xl font-semibold text-foreground">
              {readyNodes.length}/{kubernetesNodes.length || 0}
            </div>
            <div className="text-sm font-medium text-muted-foreground">nodes ready</div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {healthyVmCount}/{vms.length || 0} VM agents healthy
            </div>
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={restartStatusDetail}
          eyebrow="Step 3"
          title="Restart status"
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
                ? "Web pod restart visible"
                : "Waiting for recycle"}
            </div>
          </div>
        </DemoFlowCard>

        <DemoFlowCard
          description={targetDetail}
          eyebrow="Step 4"
          title="Web app handoff"
          tone={runningWebPods.length > 0 ? "success" : "warning"}
        >
          <div className="space-y-2">
            <div className="text-base font-semibold text-foreground">
              {runningWebPods[0]?.name ?? "No running web pod"}
            </div>
            <div className="text-sm text-muted-foreground">
              {uniqueReplacementTargets.length > 0
                ? `Serving from ${uniqueReplacementTargets.join(", ")}`
                : "Waiting for a healthy replacement node"}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {runningWebPods.length} running route target{runningWebPods.length === 1 ? "" : "s"}
            </div>
          </div>
        </DemoFlowCard>
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
    <article className={`relative rounded-[1.5rem] border px-4 py-4 ${toneClasses}`}>
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

function ControlModePasswordModal({
  errorMessage,
  isOpen,
  isSubmitting,
  password,
  onCancel,
  onPasswordChange,
  onSubmit,
}: {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  password: string;
  onCancel: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/30">
        <div className="monitor-label">Control mode</div>
        <h2 className="mt-2 text-2xl font-semibold">Enter password to continue</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Control mode exposes the operational dashboard and guarded recovery actions. Once
          unlocked, access stays cached in this browser for the next 12 hours.
        </p>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium">Password</span>
          <input
            autoFocus
            className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
            name="monitor-mode-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
        </label>
        {errorMessage ? (
          <p className="mt-3 text-sm font-medium text-critical">{errorMessage}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-border/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent/80"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? "Unlocking..." : "Unlock control mode"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionConfirmationModal({
  confirmation,
  onCancel,
  onConfirm,
}: {
  confirmation: PendingConfirmation | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirmation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/30">
        <div className="monitor-label">Confirm action</div>
        <h2 className="mt-2 text-2xl font-semibold">Run this demo command?</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{confirmation.message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-border/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent/80"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

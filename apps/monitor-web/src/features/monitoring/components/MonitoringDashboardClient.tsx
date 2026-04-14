"use client";

import { useState } from "react";
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
import type { MonitoringSnapshot, MonitoringVm } from "@/features/monitoring/types";

type Props = {
  initialSnapshot: MonitoringSnapshot;
  streamUrl: string;
  demoUrl: string;
};

type DashboardTabId = "overview" | "infrastructure" | "controls";

type PendingConfirmation = {
  actionKey: string;
  message: string;
  request: () => Promise<Response>;
  onSuccess?: (payload: Record<string, unknown>) => Promise<void>;
};

export function MonitoringDashboardClient({ initialSnapshot, streamUrl, demoUrl }: Props) {
  const { replaceSnapshot, snapshot, streamStatus } = useMonitoringStream(
    initialSnapshot,
    streamUrl
  );
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>("overview");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

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

  const tabs = [
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
      description: "Guarded demo actions and the event feed for fast operational review.",
      badge: "Actions",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
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
                Keep the live summary visible, then switch between service overview, infrastructure,
                and guarded controls without losing the current monitoring context.
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-accent/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {snapshot.service.history.length} checks in history
            </div>
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
          </div>
        </div>
        {activeTab === "overview" ? (
          <div
            aria-labelledby="monitor-tab-overview"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-overview"
            role="tabpanel"
          >
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <LatencyChart history={snapshot.service.history} targetUrl={snapshot.service.target_url} />
              <VmPanel
                pendingActions={pendingActions}
                variant="compact"
                vms={snapshot.vms}
                onVmPowerAction={handleVmPowerAction}
              />
            </section>
            <EventTimeline events={snapshot.events} />
          </div>
        ) : null}
        {activeTab === "infrastructure" ? (
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
        {activeTab === "controls" ? (
          <div
            aria-labelledby="monitor-tab-controls"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-controls"
            role="tabpanel"
          >
            <LiveClubcrmFrame demoUrl={demoUrl} />
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

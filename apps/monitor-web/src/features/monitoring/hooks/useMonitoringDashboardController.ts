"use client";

import { useEffect, useMemo, useState } from "react";
import { useMonitoringStream } from "@/features/monitoring/hooks/useMonitoringStream";
import type { ActiveWebPodTarget } from "@/features/monitoring/lib/demo";
import { resolveDemoFailoverTarget } from "@/features/monitoring/lib/demo";
import type { MonitoringSnapshot, MonitoringVm } from "@/features/monitoring/types";

type DashboardTabId = "overview" | "infrastructure" | "controls";
type DashboardMode = "control" | "demo";

const DASHBOARD_MODE_STORAGE_KEY = "clubcrm-control-dashboard-mode";

type PendingConfirmation = {
  actionKey: string;
  message: string;
  request: () => Promise<Response>;
  onSuccess?: (payload: Record<string, unknown>) => Promise<void>;
};

type DemoFailoverRun = {
  runToken: number;
  targetVmId: string;
};

type Props = {
  initialControlModeUnlocked: boolean;
  initialSnapshot: MonitoringSnapshot;
  streamUrl: string;
};

export function useMonitoringDashboardController({
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
  const [demoFailoverRun, setDemoFailoverRun] = useState<DemoFailoverRun | null>(null);
  const isDemoMode = dashboardMode === "demo";
  const failoverTarget = resolveDemoFailoverTarget(snapshot, activeWebPodTarget);
  const tabs = useMemo(
    () =>
      isDemoMode
        ? [
            {
              id: "controls" as const,
              label: "Demo",
              description:
                "Canonical server-failover trigger, live routing story, and event feed for presentation mode.",
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

    while (Date.now() <= deadline) {
      const latestSnapshot = await refreshSnapshot();
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
    if (!failoverTarget.vmId) {
      setActionError("No active ClubCRM server is available to restart yet.");
      return;
    }

    const actionKey = `vm:${failoverTarget.vmId}:restart`;
    if (pendingActions[actionKey]) {
      return;
    }

    setPendingActions((current) => ({ ...current, [actionKey]: true }));
    setActionError(null);

    try {
      const response = await fetch(`/api/control/vms/${failoverTarget.vmId}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
      } & Record<string, unknown>;

      if (!response.ok) {
        throw new Error(payload.detail ?? "Unable to start the failover flow.");
      }

      setDemoFailoverRun((current) => ({
        runToken: (current?.runToken ?? 0) + 1,
        targetVmId: failoverTarget.vmId ?? "",
      }));
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

  return {
    actionError,
    activeTab,
    activeWebPodTarget,
    controlModeError,
    controlModePassword,
    dashboardMode,
    demoFailoverRun,
    failoverTarget,
    isControlModeUnlocked,
    isDemoMode,
    isUnlockingControlMode,
    pendingActions,
    pendingConfirmation: pendingConfirmation
      ? {
          actionKey: pendingConfirmation.actionKey,
          message: pendingConfirmation.message,
        }
      : null,
    setActiveTab,
    setActiveWebPodTarget,
    setControlModePassword,
    setDashboardMode,
    setPendingConfirmation,
    setShowControlModePrompt,
    showControlModePrompt,
    snapshot,
    streamStatus,
    tabs,
    executeConfirmedAction,
    handleContainerAction,
    handleControlModeRequest,
    handleDemoFlowStart,
    handlePodRecycle,
    handleVmPowerAction,
    unlockControlMode,
  };
}

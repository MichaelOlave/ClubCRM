"use client";

import { ControlRail } from "@/features/monitoring/components/ControlRail";
import { DockerPanel } from "@/features/monitoring/components/DockerPanel";
import { EventTimeline } from "@/features/monitoring/components/EventTimeline";
import { GlobalStatusHeader } from "@/features/monitoring/components/GlobalStatusHeader";
import { KubernetesPanel } from "@/features/monitoring/components/KubernetesPanel";
import { LatencyChart } from "@/features/monitoring/components/LatencyChart";
import { LiveClubcrmFrame } from "@/features/monitoring/components/LiveClubcrmFrame";
import { StoragePanel } from "@/features/monitoring/components/StoragePanel";
import { VmPanel } from "@/features/monitoring/components/VmPanel";
import { ActionConfirmationModal } from "@/features/monitoring/components/dashboard/ActionConfirmationModal";
import { ControlModePasswordModal } from "@/features/monitoring/components/dashboard/ControlModePasswordModal";
import { DemoFlowRail } from "@/features/monitoring/components/dashboard/DemoFlowRail";
import { useMonitoringDashboardController } from "@/features/monitoring/hooks/useMonitoringDashboardController";
import type { MonitoringSnapshot } from "@/features/monitoring/types";

type Props = {
  initialSnapshot: MonitoringSnapshot;
  initialControlModeUnlocked: boolean;
  streamUrl: string;
  demoUrl: string;
};

export function MonitoringDashboardClient({
  demoUrl,
  initialControlModeUnlocked,
  initialSnapshot,
  streamUrl,
}: Props) {
  const controller = useMonitoringDashboardController({
    initialControlModeUnlocked,
    initialSnapshot,
    streamUrl,
  });

  return (
    <div className="space-y-6 pb-10">
      <ControlModePasswordModal
        errorMessage={controller.controlModeError}
        isOpen={controller.showControlModePrompt}
        isSubmitting={controller.isUnlockingControlMode}
        password={controller.controlModePassword}
        onCancel={() => {
          controller.setControlModePassword("");
          controller.setShowControlModePrompt(false);
        }}
        onPasswordChange={controller.setControlModePassword}
        onSubmit={() => void controller.unlockControlMode()}
      />
      <ActionConfirmationModal
        confirmation={controller.pendingConfirmation}
        onCancel={() => controller.setPendingConfirmation(null)}
        onConfirm={() => void controller.executeConfirmedAction()}
      />
      <GlobalStatusHeader
        actionError={controller.actionError}
        generatedAt={controller.snapshot.generated_at}
        service={controller.snapshot.service}
        streamStatus={controller.streamStatus}
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
                    value: "control" | "demo";
                  }>
                ).map((mode) => {
                  const isActive = controller.dashboardMode === mode.value;
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
                          ? controller.handleControlModeRequest()
                          : controller.setDashboardMode("demo")
                      }
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {!controller.isControlModeUnlocked ? (
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Control mode locked
                </div>
              ) : null}
              <div className="rounded-full border border-border/70 bg-accent/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {controller.snapshot.service.history.length} checks in history
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-accent/55 px-4 py-4 text-sm leading-6 text-muted-foreground">
            {controller.isDemoMode
              ? "Demo mode is enabled. This view stays presentation-ready with the server-failover rail, the live ClubCRM routing story, and the event feed only."
              : "Control mode is enabled. The operational overview, infrastructure, and guarded controls are unlocked for deeper troubleshooting."}
          </div>
          <div className="flex flex-col gap-4">
            <div
              aria-label="Monitoring views"
              className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2"
              role="tablist"
            >
              {controller.tabs.map((tab) => {
                const isActive = tab.id === controller.activeTab;

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
                    onClick={() => controller.setActiveTab(tab.id)}
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
            {controller.isDemoMode ? (
              <DemoFlowRail
                activeWebPodTarget={controller.activeWebPodTarget}
                failoverTarget={controller.failoverTarget}
                pendingActions={controller.pendingActions}
                snapshot={controller.snapshot}
                streamStatus={controller.streamStatus}
                onStartFailover={() => void controller.handleDemoFlowStart()}
              />
            ) : null}
          </div>
        </div>
        {!controller.isDemoMode && controller.activeTab === "overview" ? (
          <div
            aria-labelledby="monitor-tab-overview"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-overview"
            role="tabpanel"
          >
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <LatencyChart
                history={controller.snapshot.service.history}
                targetUrl={controller.snapshot.service.target_url}
              />
              <VmPanel
                pendingActions={controller.pendingActions}
                showActions={controller.isDemoMode}
                variant="compact"
                vms={controller.snapshot.vms}
                onVmPowerAction={controller.handleVmPowerAction}
              />
            </section>
            <EventTimeline events={controller.snapshot.events} />
          </div>
        ) : null}
        {!controller.isDemoMode && controller.activeTab === "infrastructure" ? (
          <div
            aria-labelledby="monitor-tab-infrastructure"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-infrastructure"
            role="tabpanel"
          >
            <KubernetesPanel kubernetes={controller.snapshot.kubernetes} />
            <StoragePanel kubernetes={controller.snapshot.kubernetes} />
            <DockerPanel containers={controller.snapshot.containers} />
          </div>
        ) : null}
        {controller.isDemoMode && controller.activeTab === "controls" ? (
          <div
            aria-labelledby="monitor-tab-controls"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-controls"
            role="tabpanel"
          >
            <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
              <LiveClubcrmFrame
                activeFailoverRun={controller.demoFailoverRun}
                demoUrl={demoUrl}
                onActiveWebPodChange={controller.setActiveWebPodTarget}
                serverStates={controller.snapshot.vms.map((vm) => ({
                  agentStatus: vm.agent_status,
                  id: vm.id,
                  powerState: vm.power_state,
                }))}
              />
              <EventTimeline events={controller.snapshot.events} />
            </div>
          </div>
        ) : null}
        {!controller.isDemoMode && controller.activeTab === "controls" ? (
          <div
            aria-labelledby="monitor-tab-controls"
            className="space-y-6 px-6 py-6"
            id="monitor-panel-controls"
            role="tabpanel"
          >
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <ControlRail
                containers={controller.snapshot.containers}
                pendingActions={controller.pendingActions}
                pods={controller.snapshot.kubernetes.pods}
                vms={controller.snapshot.vms}
                onContainerAction={controller.handleContainerAction}
                onPodRecycle={controller.handlePodRecycle}
                onVmPowerAction={controller.handleVmPowerAction}
              />
              <EventTimeline events={controller.snapshot.events} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

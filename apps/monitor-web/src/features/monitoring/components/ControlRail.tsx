type VmSummary = {
  id: string;
};

type ContainerSummary = {
  name: string;
  status: string;
};

type PodSummary = {
  namespace: string;
  name: string;
  status: string;
};

type Props = {
  vms: VmSummary[];
  containers: Record<string, ContainerSummary[]>;
  pods: PodSummary[];
  pendingActions: Record<string, boolean>;
  onVmPowerAction: (vmId: string, action: "start" | "stop" | "restart") => void;
  onContainerAction: (
    vmId: string,
    containerName: string,
    action: "start" | "stop" | "restart"
  ) => void;
  onPodRecycle: (namespace: string, podName: string) => void;
};

export function ControlRail({
  containers,
  pendingActions,
  pods,
  vms,
  onContainerAction,
  onPodRecycle,
  onVmPowerAction,
}: Props) {
  const prioritizedPods = prioritizePods(pods).slice(0, 6);
  const hasContainers = Object.values(containers).some((vmContainers) => vmContainers.length > 0);

  return (
    <section className="monitor-card px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="monitor-label">Control rail</div>
          <h2 className="mt-2 text-2xl font-semibold">Guarded demo actions</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          Explicit prompts before destructive actions
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ControlGroup title="Pod recycle">
          {prioritizedPods.length > 0 ? (
            prioritizedPods.map((pod) => {
              const actionKey = `pod:${pod.namespace}:${pod.name}:recycle`;
              return (
                <div
                  key={`${pod.namespace}-${pod.name}`}
                  className="rounded-2xl border border-border/70 bg-accent/75 p-4"
                >
                  <div className="mb-3">
                    <div className="font-medium">{pod.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {pod.namespace} • {pod.status}
                    </div>
                  </div>
                  <ActionButton
                    ariaLabel={`recycle ${pod.namespace}/${pod.name}`}
                    disabled={Boolean(pendingActions[actionKey])}
                    label={pendingActions[actionKey] ? "recycling..." : "recycle"}
                    pending={Boolean(pendingActions[actionKey])}
                    onClick={() => onPodRecycle(pod.namespace, pod.name)}
                  />
                </div>
              );
            })
          ) : (
            <EmptyState message="No pod snapshot available yet." />
          )}
        </ControlGroup>
        <ControlGroup title="VM power">
          {vms.map((vm) => {
            const isVmActionPending = (["start", "stop", "restart"] as const).some(
              (action) => pendingActions[`vm:${vm.id}:${action}`]
            );

            return (
              <div
                key={vm.id}
                className={`rounded-2xl border border-border/70 bg-accent/75 p-4 ${
                  isVmActionPending ? "ring-1 ring-primary/50" : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-medium">{vm.id}</div>
                  {isVmActionPending ? (
                    <div className="flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <StatusRing />
                      Running
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["start", "stop", "restart"] as const).map((action) => {
                    const actionKey = `vm:${vm.id}:${action}`;
                    const isPending = Boolean(pendingActions[actionKey]);
                    return (
                      <ActionButton
                        key={action}
                        ariaLabel={`${action} ${vm.id}`}
                        disabled={isVmActionPending}
                        label={isPending ? `${toActionProgressLabel(action)}...` : action}
                        pending={isPending}
                        onClick={() => onVmPowerAction(vm.id, action)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ControlGroup>
      </div>
      {hasContainers ? (
        <div className="mt-6">
          <ControlGroup title="Container actions">
            {Object.entries(containers).flatMap(([vmId, vmContainers]) =>
              vmContainers.slice(0, 3).map((container) => {
                const actionKey = `container:${vmId}:${container.name}:restart`;
                return (
                  <div
                    key={`${vmId}-${container.name}`}
                    className="rounded-2xl border border-border/70 bg-accent/75 p-4"
                  >
                    <div className="mb-3">
                      <div className="font-medium">{container.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {vmId} • {container.status}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        ariaLabel={`restart ${container.name} on ${vmId}`}
                        disabled={Boolean(actionKey && pendingActions[actionKey])}
                        label={pendingActions[actionKey] ? "restarting..." : "restart"}
                        pending={Boolean(actionKey && pendingActions[actionKey])}
                        onClick={() => onContainerAction(vmId, container.name, "restart")}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </ControlGroup>
        </div>
      ) : null}
    </section>
  );
}

function prioritizePods(pods: PodSummary[]): PodSummary[] {
  const ordered = [...pods].sort((left, right) => getPodPriority(left) - getPodPriority(right));
  const uniquePods = new Map<string, PodSummary>();

  for (const pod of ordered) {
    const key = `${pod.namespace}/${pod.name}`;
    if (!uniquePods.has(key)) {
      uniquePods.set(key, pod);
    }
  }

  return Array.from(uniquePods.values());
}

function getPodPriority(pod: PodSummary) {
  if (pod.namespace === "clubcrm" && pod.name.startsWith("clubcrm-web")) {
    return 0;
  }

  if (pod.namespace === "clubcrm" && pod.name.startsWith("clubcrm-api")) {
    return 1;
  }

  if (pod.namespace === "clubcrm") {
    return 2;
  }

  return 3;
}

function ControlGroup({ children, title }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="monitor-label">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ActionButton({
  ariaLabel,
  disabled,
  label,
  pending = false,
  onClick,
}: {
  ariaLabel: string;
  disabled: boolean;
  label: string;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      {pending ? <StatusRing /> : null}
      {label}
    </button>
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

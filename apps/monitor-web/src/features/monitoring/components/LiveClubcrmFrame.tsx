"use client";

import { useEffect, useRef, useState } from "react";

type RuntimeInstance = {
  service: string;
  instanceId: string;
  podName: string | null;
  namespace: string | null;
  nodeName: string | null;
  platform: "kubernetes" | "local";
};

type LiveRoutingSnapshot = {
  checkedAt: string;
  webRuntime: RuntimeInstance;
  api: {
    connected: boolean;
    status: string;
    endpoint: string;
    runtime: RuntimeInstance | null;
  };
};

type RoutingChange = {
  id: string;
  message: string;
  recordedAt: string;
};

type ServerState = {
  id: string;
  powerState: string;
  agentStatus: "online" | "offline" | "stale";
};

type DemoFailoverRun = {
  runToken: number;
  targetVmId: string;
} | null;

type Props = {
  activeFailoverRun?: DemoFailoverRun;
  demoUrl: string;
  onActiveWebPodChange?: (
    target: {
      instanceId: string;
      podName: string | null;
      namespace: string | null;
      nodeName: string | null;
    } | null
  ) => void;
  serverStates?: ServerState[];
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 1500;

function getHelpfulLoadError(message: string, demoUrl: string) {
  if (message.includes("HTTP 404")) {
    return `${message} The configured ClubCRM demo URL (${demoUrl}) did not expose the expected failover route. Check NEXT_PUBLIC_CLUBCRM_DEMO_URL or CLUBCRM_DEMO_URL for the main ClubCRM web app origin.`;
  }

  return message;
}

export function LiveClubcrmFrame({
  activeFailoverRun = null,
  demoUrl,
  onActiveWebPodChange,
  serverStates = [],
}: Props) {
  const [snapshot, setSnapshot] = useState<LiveRoutingSnapshot | null>(null);
  const [changes, setChanges] = useState<RoutingChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
  const [interruptionObserved, setInterruptionObserved] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const snapshotRef = useRef<LiveRoutingSnapshot | null>(null);
  const guidedFailoverRef = useRef<{
    baselineSnapshot: LiveRoutingSnapshot;
    lockedReplacementSnapshot: LiveRoutingSnapshot | null;
    runToken: number;
    targetVmId: string;
  } | null>(null);

  useEffect(() => {
    if (!activeFailoverRun || !snapshotRef.current) {
      return;
    }

    guidedFailoverRef.current = {
      baselineSnapshot: snapshotRef.current,
      lockedReplacementSnapshot: null,
      runToken: activeFailoverRun.runToken,
      targetVmId: activeFailoverRun.targetVmId,
    };
    setRunStartedAt(new Date().toISOString());
    setInterruptionObserved(false);
    setClockNow(Date.now());
  }, [activeFailoverRun]);

  useEffect(() => {
    if (!activeFailoverRun) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeFailoverRun]);

  useEffect(() => {
    let isActive = true;
    let timeoutId: number | null = null;
    let requestController: AbortController | null = null;
    let isRefreshing = false;

    function scheduleNextRefresh() {
      if (!isActive) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void refreshSnapshot();
      }, POLL_INTERVAL_MS);
    }

    async function refreshSnapshot() {
      if (!isActive || isRefreshing) {
        return;
      }

      isRefreshing = true;
      requestController = new AbortController();
      const abortTimeoutId = window.setTimeout(() => {
        requestController?.abort();
      }, POLL_TIMEOUT_MS);

      try {
        const response = await fetch(`/api/live-routing?ts=${Date.now()}`, {
          cache: "no-store",
          signal: requestController.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          detail?: string;
        } & Partial<LiveRoutingSnapshot>;

        if (!response.ok) {
          throw new Error(payload.detail ?? "Unable to load the failover view.");
        }

        const nextSnapshot = payload as LiveRoutingSnapshot;
        if (!isActive) {
          return;
        }

        const displaySnapshot = selectDisplaySnapshot(
          guidedFailoverRef.current,
          nextSnapshot,
          serverStates
        );
        const nextChanges = collectRoutingChanges(snapshotRef.current, displaySnapshot);
        snapshotRef.current = displaySnapshot;
        setSnapshot(displaySnapshot);
        setLoadError(null);
        setReconnectError(null);
        setIsLoading(false);
        setClockNow(Date.now());

        if (!nextSnapshot.api.connected) {
          setInterruptionObserved(true);
        }

        if (nextChanges.length > 0) {
          setChanges((current) => [...nextChanges, ...current].slice(0, 6));
        }
      } catch (error) {
        if (isActive) {
          setInterruptionObserved(true);
          const rawMessage =
            error instanceof Error ? error.message : "Unable to load the failover view.";
          const message = getHelpfulLoadError(rawMessage, demoUrl);
          if (snapshotRef.current) {
            setReconnectError(message);
          } else {
            setLoadError(message);
          }
          setIsLoading(false);
        }
      } finally {
        window.clearTimeout(abortTimeoutId);
        requestController = null;
        isRefreshing = false;
        scheduleNextRefresh();
      }
    }

    void refreshSnapshot();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      requestController?.abort();
    };
  }, [demoUrl, serverStates]);

  useEffect(() => {
    onActiveWebPodChange?.(
      snapshot
        ? {
            instanceId: snapshot.webRuntime.instanceId,
            podName: snapshot.webRuntime.podName,
            namespace: snapshot.webRuntime.namespace,
            nodeName: snapshot.webRuntime.nodeName,
          }
        : null
    );

    return () => {
      onActiveWebPodChange?.(null);
    };
  }, [onActiveWebPodChange, snapshot]);

  const baselineSnapshot = guidedFailoverRef.current?.baselineSnapshot ?? null;
  const hero = getHeroState({
    activeFailoverRun,
    baselineSnapshot,
    clockNow,
    interruptionObserved,
    reconnectError,
    runStartedAt,
    snapshot,
  });

  return (
    <section className="monitor-card overflow-hidden" id="monitor-demo-surface">
      <div className="flex flex-col gap-4 border-b border-border/70 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="monitor-label">Live app surface</div>
          <h2 className="text-2xl font-semibold">ClubCRM failover story</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            This panel polls the live routing endpoint directly from monitor-web. It is not an
            iframe, so it can keep the presenter story visible even if the public page has a brief
            interruption during failover.
          </p>
        </div>
        <a
          className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary/15"
          href={demoUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open public audience screen
        </a>
      </div>
      <div className="space-y-6 p-4 lg:p-5">
        <div className="rounded-full border border-border/70 bg-accent/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {demoUrl}
        </div>

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-accent/50 px-5 py-12 text-center text-sm text-muted-foreground">
            Loading failover view...
          </div>
        ) : loadError ? (
          <div className="rounded-[1.5rem] border border-critical/30 bg-critical/8 px-5 py-8">
            <p className="text-sm font-semibold text-foreground">
              Unable to load the failover view
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{loadError}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Use the live-page link above to verify the route directly while monitor-web keeps
              polling for recovery.
            </p>
          </div>
        ) : snapshot ? (
          <>
            <div className="rounded-[1.6rem] border border-primary/20 bg-background/75 p-5 shadow-[0_18px_40px_rgba(8,24,50,0.08)]">
              <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
                <div className="max-w-3xl space-y-3">
                  <StatusBadge label={hero.badge} tone={hero.badgeTone} />
                  <div className="space-y-2">
                    <p className="text-3xl font-semibold tracking-tight text-foreground transition-colors sm:text-4xl 2xl:text-5xl">
                      {hero.headline}
                    </p>
                    <p className="text-lg font-medium text-foreground">{hero.title}</p>
                    <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                      {hero.description}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-border/70 bg-accent/55 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Current route
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                    {getServerLabel(snapshot.webRuntime)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pod {getTechnicalLabel(snapshot.webRuntime)}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <SummarySignalCard
                  description={
                    hero.baselineServerTechnical
                      ? `Pod ${hero.baselineServerTechnical}`
                      : "Will be captured when a guided server failover starts."
                  }
                  label="Baseline server"
                  value={hero.baselineServer}
                />
                <SummarySignalCard
                  description={`Pod ${getTechnicalLabel(snapshot.webRuntime)}`}
                  label="Current server"
                  value={getServerLabel(snapshot.webRuntime)}
                />
                <SummarySignalCard
                  description={snapshot.api.endpoint}
                  label="API status"
                  value={snapshot.api.connected ? "Connected" : "Offline"}
                />
                <SummarySignalCard
                  description={
                    runStartedAt
                      ? `Run started ${formatTimestamp(runStartedAt)}`
                      : "Starts when the presenter runs the server failover command."
                  }
                  label={hero.elapsedLabelLabel}
                  value={hero.elapsedLabel}
                />
              </dl>
            </div>

            {reconnectError ? (
              <div className="rounded-[1.25rem] border border-warning/30 bg-warning/10 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Disruption observed</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{reconnectError}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keeping the last good routing snapshot on screen until the next healthy sample
                  lands.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <RuntimeCard
                description="This is the current browser-routed server reported by the live ClubCRM endpoint. The server label is the main presenter signal; pod details remain visible as supporting proof."
                instance={snapshot.webRuntime}
                title="Active server"
              />
              <RuntimeCard
                description={`Reference signal only. This is the API runtime behind the health endpoint. Status: ${snapshot.api.status} • ${snapshot.api.endpoint}`}
                instance={snapshot.api.runtime}
                title="API upstream server"
              />
            </div>

            <div className="grid gap-4 2xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[1.25rem] border border-border/70 bg-accent/55 p-4">
                <p className="monitor-label">Run status</p>
                <p className="mt-2 text-2xl font-semibold">{hero.supportingValue}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {hero.supportingText}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-accent/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Recent routing changes</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {changes.length} observed
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {changes.length > 0 ? (
                    changes.map((change) => (
                      <div
                        key={change.id}
                        className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{change.message}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatTimestamp(change.recordedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                      No server handoff has been observed yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function RuntimeCard({
  description,
  instance,
  title,
}: {
  description: string;
  instance: RuntimeInstance | null;
  title: string;
}) {
  const serverLabel = getServerLabel(instance);

  return (
    <article className="rounded-[1.25rem] border border-border/70 bg-accent/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="monitor-label">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{serverLabel}</p>
          <p className="mt-2 text-sm text-muted-foreground">Pod {getTechnicalLabel(instance)}</p>
        </div>
        <StatusBadge
          label={instance?.platform ?? "offline"}
          tone={instance ? "success" : "critical"}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetadataRow label="Service" value={instance?.service ?? "Unavailable"} />
        <MetadataRow label="Instance" value={instance?.instanceId ?? "Unavailable"} />
        <MetadataRow label="Namespace" value={instance?.namespace ?? "Unavailable"} />
        <MetadataRow label="Node / VM" value={instance?.nodeName ?? "Unavailable"} />
      </dl>
    </article>
  );
}

function SummarySignalCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-border/70 bg-background/60 p-5">
      <p className="monitor-label">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-all text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "critical" }) {
  const toneClasses =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-critical/30 bg-critical/10 text-critical";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses}`}
    >
      {label}
    </span>
  );
}

function collectRoutingChanges(
  previousSnapshot: LiveRoutingSnapshot | null,
  nextSnapshot: LiveRoutingSnapshot
): RoutingChange[] {
  if (!previousSnapshot) {
    return [];
  }

  const changes: RoutingChange[] = [];
  const recordedAt = nextSnapshot.checkedAt;

  if (previousSnapshot.webRuntime.instanceId !== nextSnapshot.webRuntime.instanceId) {
    changes.push({
      id: `web-${recordedAt}`,
      message: `Traffic moved from ${getServerLabel(previousSnapshot.webRuntime)} (${getTechnicalLabel(previousSnapshot.webRuntime)}) to ${getServerLabel(nextSnapshot.webRuntime)} (${getTechnicalLabel(nextSnapshot.webRuntime)}).`,
      recordedAt,
    });
  }

  const previousApiId = previousSnapshot.api.runtime?.instanceId ?? null;
  const nextApiId = nextSnapshot.api.runtime?.instanceId ?? null;

  if (previousApiId !== nextApiId && nextApiId) {
    changes.push({
      id: `api-${recordedAt}`,
      message: `API upstream moved from ${getServerLabel(previousSnapshot.api.runtime)} to ${getServerLabel(nextSnapshot.api.runtime)}.`,
      recordedAt,
    });
  }

  return changes;
}

function selectDisplaySnapshot(
  guidedFailover: {
    baselineSnapshot: LiveRoutingSnapshot;
    lockedReplacementSnapshot: LiveRoutingSnapshot | null;
    runToken: number;
    targetVmId: string;
  } | null,
  nextSnapshot: LiveRoutingSnapshot,
  serverStates: ServerState[]
) {
  if (!guidedFailover) {
    return nextSnapshot;
  }

  if (guidedFailover.lockedReplacementSnapshot) {
    const lockedInstanceId = guidedFailover.lockedReplacementSnapshot.webRuntime.instanceId;
    if (nextSnapshot.webRuntime.instanceId === lockedInstanceId) {
      guidedFailover.lockedReplacementSnapshot = nextSnapshot;
      return nextSnapshot;
    }

    return {
      ...nextSnapshot,
      webRuntime: guidedFailover.lockedReplacementSnapshot.webRuntime,
    };
  }

  const targetServerHealthy = isServerHealthy(guidedFailover.targetVmId, serverStates);
  const movedAwayFromBaseline =
    guidedFailover.baselineSnapshot.webRuntime.instanceId !== nextSnapshot.webRuntime.instanceId;
  const movedToDifferentServer = !isSameServer(
    guidedFailover.targetVmId,
    nextSnapshot.webRuntime.nodeName
  );

  if (movedAwayFromBaseline && movedToDifferentServer && !targetServerHealthy) {
    guidedFailover.lockedReplacementSnapshot = nextSnapshot;
    return nextSnapshot;
  }

  if (movedAwayFromBaseline && movedToDifferentServer) {
    guidedFailover.lockedReplacementSnapshot = nextSnapshot;
    return nextSnapshot;
  }

  return {
    ...nextSnapshot,
    webRuntime: guidedFailover.baselineSnapshot.webRuntime,
  };
}

function isServerHealthy(serverId: string, serverStates: ServerState[]) {
  const server = serverStates.find(
    (candidate) => normalizeServerId(candidate.id) === normalizeServerId(serverId)
  );
  if (!server) {
    return false;
  }

  return server.powerState === "running" && server.agentStatus === "online";
}

function isSameServer(serverId: string, nodeName: string | null) {
  if (!nodeName) {
    return false;
  }

  return normalizeServerId(serverId) === normalizeServerId(nodeName);
}

function normalizeServerId(value: string) {
  return value.trim().toLowerCase();
}

function getHeroState({
  activeFailoverRun,
  baselineSnapshot,
  clockNow,
  interruptionObserved,
  reconnectError,
  runStartedAt,
  snapshot,
}: {
  activeFailoverRun: DemoFailoverRun;
  baselineSnapshot: LiveRoutingSnapshot | null;
  clockNow: number;
  interruptionObserved: boolean;
  reconnectError: string | null;
  runStartedAt: string | null;
  snapshot: LiveRoutingSnapshot | null;
}) {
  const baselineServer = baselineSnapshot ? getServerLabel(baselineSnapshot.webRuntime) : "Waiting";
  const baselineServerTechnical = baselineSnapshot
    ? getTechnicalLabel(baselineSnapshot.webRuntime)
    : null;
  const currentServer = getServerLabel(snapshot?.webRuntime ?? null);
  const movedToReplacement =
    Boolean(baselineSnapshot) &&
    Boolean(snapshot) &&
    baselineSnapshot?.webRuntime.instanceId !== snapshot?.webRuntime.instanceId;
  const elapsedLabel = getElapsedLabel(
    runStartedAt,
    clockNow,
    movedToReplacement ? (snapshot?.checkedAt ?? null) : null
  );

  if (movedToReplacement && snapshot) {
    return {
      badge: "Recovery confirmed",
      badgeTone: "success" as const,
      headline: currentServer,
      title: "Traffic recovered on a replacement server.",
      description: `The routing sample moved from ${baselineServer} to ${currentServer}. This mirrors the public audience screen while preserving the presenter's last good recovery signal on screen.`,
      supportingText: `Recovery was confirmed in ${elapsedLabel}.`,
      supportingValue: formatTimestamp(snapshot.checkedAt),
      baselineServer,
      baselineServerTechnical,
      elapsedLabel,
      elapsedLabelLabel: "Time to reroute",
    };
  }

  if (reconnectError || interruptionObserved) {
    return {
      badge: "Disruption observed",
      badgeTone: "warning" as const,
      headline: currentServer,
      title: "The route is reconnecting during the failover window.",
      description:
        "The last good routing sample stays visible while monitor-web waits for the next healthy response from ClubCRM.",
      supportingText:
        "This panel derives its run state client-side from live routing snapshots and local timing. No backend demo session is coordinating the handoff.",
      supportingValue: runStartedAt ? formatTimestamp(runStartedAt) : "Run active",
      baselineServer,
      baselineServerTechnical,
      elapsedLabel,
      elapsedLabelLabel: activeFailoverRun ? "Elapsed run time" : "Failover timer",
    };
  }

  if (activeFailoverRun) {
    return {
      badge: "Failover triggered",
      badgeTone: "warning" as const,
      headline: baselineServer,
      title: "The presenter console is watching for traffic to leave the active server.",
      description: `The canonical demo path restarted ${activeFailoverRun.targetVmId}. This screen will promote the replacement server as soon as the browser route moves away from ${baselineServer}.`,
      supportingText:
        "Leave this surface open while the public audience screen stays projected. Both views are describing the same live routing endpoint with matching server-first language.",
      supportingValue: runStartedAt ? formatTimestamp(runStartedAt) : "Run active",
      baselineServer,
      baselineServerTechnical,
      elapsedLabel,
      elapsedLabelLabel: "Elapsed run time",
    };
  }

  return {
    badge: "Ready",
    badgeTone: "success" as const,
    headline: currentServer,
    title: "The presenter console is standing by for the next server failover run.",
    description:
      "Use the server failover command above to restart the active ClubCRM server. This live routing view will then watch for disruption and confirm the healthy replacement target.",
    supportingText:
      "The public audience screen keeps its own fallback pod recycle button, but the canonical demo trigger for the networking presentation lives here in monitor-web.",
    supportingValue: snapshot ? formatTimestamp(snapshot.checkedAt) : "Waiting",
    baselineServer,
    baselineServerTechnical,
    elapsedLabel: "Standing by",
    elapsedLabelLabel: "Failover timer",
  };
}

function getServerLabel(instance: RuntimeInstance | null): string {
  if (!instance) {
    return "Unavailable";
  }

  return instance.nodeName ?? instance.podName ?? instance.instanceId;
}

function getTechnicalLabel(instance: RuntimeInstance | null): string {
  if (!instance) {
    return "Unavailable";
  }

  return instance.podName ?? instance.instanceId;
}

function getElapsedLabel(startedAt: string | null, nowMs: number, completedAt: string | null) {
  if (!startedAt) {
    return "Standing by";
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return "Unavailable";
  }

  const endMs = completedAt ? new Date(completedAt).getTime() : nowMs;
  const totalSeconds = Math.max(0, Math.floor((endMs - startedAtMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

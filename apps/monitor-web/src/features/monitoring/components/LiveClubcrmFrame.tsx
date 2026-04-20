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

type Props = {
  demoUrl: string;
  onActiveWebPodChange?: (
    target: {
      instanceId: string;
      podName: string | null;
      namespace: string | null;
      nodeName: string | null;
    } | null
  ) => void;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 1500;

export function LiveClubcrmFrame({ demoUrl, onActiveWebPodChange }: Props) {
  const [snapshot, setSnapshot] = useState<LiveRoutingSnapshot | null>(null);
  const [changes, setChanges] = useState<RoutingChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const snapshotRef = useRef<LiveRoutingSnapshot | null>(null);
  const interruptionDetectedRef = useRef(false);

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

        const stabilizedSnapshot = stabilizeSnapshot(
          snapshotRef.current,
          nextSnapshot,
          interruptionDetectedRef.current
        );
        const nextChanges = collectRoutingChanges(snapshotRef.current, stabilizedSnapshot);
        snapshotRef.current = stabilizedSnapshot;
        setSnapshot(stabilizedSnapshot);
        setLoadError(null);
        setReconnectError(null);
        setIsLoading(false);
        interruptionDetectedRef.current = !nextSnapshot.api.connected;

        if (nextChanges.length > 0) {
          setChanges((current) => [...nextChanges, ...current].slice(0, 6));
        }
      } catch (error) {
        if (isActive) {
          interruptionDetectedRef.current = true;
          const message =
            error instanceof Error ? error.message : "Unable to load the failover view.";
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
  }, []);

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

  return (
    <section className="monitor-card overflow-hidden" id="monitor-demo-surface">
      <div className="flex flex-col gap-4 border-b border-border/70 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="monitor-label">Live app surface</div>
          <h2 className="text-2xl font-semibold">ClubCRM failover view</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            This panel polls the live ClubCRM routing endpoint directly from monitor-web, so the
            failover view keeps working even when the embedded cross-origin iframe is flaky.
          </p>
        </div>
        <a
          className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-primary transition hover:bg-primary/15"
          href={demoUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open live page
        </a>
      </div>
      <div className="space-y-6 p-4">
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
            {reconnectError ? (
              <div className="rounded-[1.25rem] border border-warning/30 bg-warning/10 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">
                  Waiting for routing to recover
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{reconnectError}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keeping the last good node snapshot on screen until the next healthy sample lands.
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <RuntimeCard
                description="This is the browser-routed pod. It should stay pinned for the same browser session until a real interruption forces traffic onto a replacement pod."
                instance={snapshot.webRuntime}
                title="Browser entry pod"
              />
              <RuntimeCard
                description={`Reference signal only: this is the API pod answering the health check behind ClubCRM. It may stay on the same node even when the browser entry pod fails over. Status: ${snapshot.api.status} • ${snapshot.api.endpoint}`}
                instance={snapshot.api.runtime}
                title="API upstream pod"
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[1.25rem] border border-border/70 bg-accent/55 p-4">
                <p className="monitor-label">Last sample</p>
                <p className="mt-2 text-2xl font-semibold">{formatTimestamp(snapshot.checkedAt)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sticky routing is enabled here, so the displayed entry pod stays pinned until the
                  panel observes a real interruption and recovery.
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
                        className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-foreground">{change.message}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {formatTimestamp(change.recordedAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                      No pod switches observed yet.
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
  const instanceLabel = instance ? getPrimaryLabel(instance) : "Unavailable";

  return (
    <article className="rounded-[1.25rem] border border-border/70 bg-accent/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="monitor-label">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{instanceLabel}</p>
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
      message: `Browser entry moved from ${getPrimaryLabel(previousSnapshot.webRuntime)} to ${getPrimaryLabel(nextSnapshot.webRuntime)}.`,
      recordedAt,
    });
  }

  const previousApiId = previousSnapshot.api.runtime?.instanceId ?? null;
  const nextApiId = nextSnapshot.api.runtime?.instanceId ?? null;

  if (previousApiId !== nextApiId && nextApiId) {
    changes.push({
      id: `api-${recordedAt}`,
      message: `API upstream moved from ${previousApiId ?? "unavailable"} to ${getPrimaryLabel(nextSnapshot.api.runtime)}.`,
      recordedAt,
    });
  }

  return changes;
}

function stabilizeSnapshot(
  previousSnapshot: LiveRoutingSnapshot | null,
  nextSnapshot: LiveRoutingSnapshot,
  interruptionDetected: boolean
) {
  if (!previousSnapshot || interruptionDetected) {
    return nextSnapshot;
  }

  return {
    ...nextSnapshot,
    webRuntime: previousSnapshot.webRuntime,
    api: {
      ...nextSnapshot.api,
      runtime: previousSnapshot.api.runtime,
    },
  };
}

function getPrimaryLabel(instance: RuntimeInstance | null): string {
  if (!instance) {
    return "Unavailable";
  }

  return instance.podName ?? instance.instanceId;
}

function formatTimestamp(value: string): string {
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

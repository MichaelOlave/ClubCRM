"use client";

import { useEffect, useRef, useState } from "react";

import type { LiveRoutingSnapshot, RuntimeInstance } from "@/features/health/types";

type Props = {
  initialSnapshot: LiveRoutingSnapshot;
  pollUrl?: string;
};

type RoutingChange = {
  id: string;
  message: string;
  recordedAt: string;
};

type PollState = "live" | "reconnecting";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 1500;

export function LiveRoutingPanel({
  initialSnapshot,
  pollUrl = "/system/health/live-routing",
}: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [pollState, setPollState] = useState<PollState>("live");
  const [changes, setChanges] = useState<RoutingChange[]>([]);
  const snapshotRef = useRef(initialSnapshot);
  const timeoutIdRef = useRef<number | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    function scheduleNextRefresh() {
      if (!isActive) {
        return;
      }

      timeoutIdRef.current = window.setTimeout(() => {
        void refreshSnapshot();
      }, POLL_INTERVAL_MS);
    }

    async function refreshSnapshot() {
      if (!isActive || isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      const requestController = new AbortController();
      requestControllerRef.current = requestController;
      const abortTimeoutId = window.setTimeout(() => {
        requestController.abort();
      }, POLL_TIMEOUT_MS);

      try {
        const response = await fetch(buildPollUrl(pollUrl), {
          cache: "no-store",
          signal: requestController.signal,
        });

        if (!response.ok) {
          throw new Error(`Live routing request failed with HTTP ${response.status}.`);
        }

        const nextSnapshot = (await response.json()) as LiveRoutingSnapshot;
        if (!isActive) {
          return;
        }

        const nextChanges = collectRoutingChanges(snapshotRef.current, nextSnapshot);
        snapshotRef.current = nextSnapshot;
        setPollState("live");
        setSnapshot(nextSnapshot);

        if (nextChanges.length > 0) {
          setChanges((current) => [...nextChanges, ...current].slice(0, 6));
        }
      } catch {
        if (isActive) {
          setPollState("reconnecting");
        }
      } finally {
        window.clearTimeout(abortTimeoutId);
        isRefreshingRef.current = false;
        requestControllerRef.current = null;

        scheduleNextRefresh();
      }
    }

    void refreshSnapshot();

    return () => {
      isActive = false;

      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }

      requestControllerRef.current?.abort();
    };
  }, [pollUrl]);

  return (
    <section className="rounded-[1.5rem] border border-brand-border bg-brand-surface p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand">Live routing</p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Watch the active pod change in real time
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This panel polls the live ClubCRM host every two seconds. Recycle the current web pod
              from the monitoring dashboard and the active entry pod should switch here without a
              full page reload.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusBadge
            label={pollState === "live" ? "Stream live" : "Waiting for next sample"}
            tone={pollState === "live" ? "success" : "warning"}
          />
          <StatusBadge
            label={`API ${snapshot.api.connected ? "connected" : "offline"}`}
            tone={snapshot.api.connected ? "success" : "critical"}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RuntimeCard
          description="Recycle this pod to demonstrate browser failover."
          instance={snapshot.webRuntime}
          title="Browser entry pod"
        />
        <RuntimeCard
          description={`Status: ${snapshot.api.status} • ${snapshot.api.endpoint}`}
          instance={snapshot.api.runtime}
          title="API upstream pod"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-4">
          <p className="text-sm font-medium text-foreground">Last sample</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatTimestamp(snapshot.checkedAt)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Keep this page open in the iframe while you recycle the live web pod from the companion
            monitoring stack.
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-4">
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
                  className="rounded-[1rem] border border-brand-border/70 bg-brand-surface px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{change.message}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {formatTimestamp(change.recordedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-brand-border/80 px-4 py-6 text-sm text-muted-foreground">
                No pod switches observed yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildPollUrl(pollUrl: string) {
  const url = new URL(pollUrl, window.location.origin);
  url.searchParams.set("ts", Date.now().toString());

  return url.toString();
}

function RuntimeCard({
  title,
  description,
  instance,
}: {
  title: string;
  description: string;
  instance: RuntimeInstance | null;
}) {
  const instanceLabel = instance ? getPrimaryLabel(instance) : "Unavailable";

  return (
    <article className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
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
    <div className="rounded-[1rem] border border-brand-border/70 bg-brand-surface px-4 py-3">
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
        : "border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses}`}
    >
      {label}
    </span>
  );
}

function collectRoutingChanges(
  previousSnapshot: LiveRoutingSnapshot,
  nextSnapshot: LiveRoutingSnapshot
): RoutingChange[] {
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

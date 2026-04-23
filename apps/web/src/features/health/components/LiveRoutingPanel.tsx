"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
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

type DemoPhase = "idle" | "capturingBaseline" | "waitingForFailover" | "completed" | "timeout";
type PollState = "idle" | "live" | "reconnecting";
type StepTone = "active" | "complete" | "pending" | "warning";

const POLL_INTERVAL_MS = 500;
const RECONNECT_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 1200;
const DEMO_TIMEOUT_MS = 150000;

export function LiveRoutingPanel({
  initialSnapshot,
  pollUrl = "/system/health/live-routing",
}: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollState, setPollState] = useState<PollState>("idle");
  const [changes, setChanges] = useState<RoutingChange[]>([]);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [baselineSnapshot, setBaselineSnapshot] = useState<LiveRoutingSnapshot | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [interruptionObserved, setInterruptionObserved] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const timeoutIdRef = useRef<number | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);
  const snapshotRef = useRef(initialSnapshot);
  const baselineSnapshotRef = useRef<LiveRoutingSnapshot | null>(null);
  const demoPhaseRef = useRef<DemoPhase>("idle");
  const runStartedAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    demoPhaseRef.current = demoPhase;
  }, [demoPhase]);

  useEffect(() => {
    baselineSnapshotRef.current = baselineSnapshot;
  }, [baselineSnapshot]);

  useEffect(() => {
    const shouldTick =
      runStartedAtMsRef.current !== null &&
      (demoPhase === "waitingForFailover" || demoPhase === "timeout");
    if (!shouldTick) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [demoPhase]);

  useEffect(() => {
    const shouldPoll = demoPhase === "waitingForFailover" || demoPhase === "timeout";
    if (!shouldPoll) {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }

      requestControllerRef.current?.abort();
      return;
    }

    let isActive = true;

    function scheduleNextRefresh(delayMs = POLL_INTERVAL_MS) {
      if (
        !isActive ||
        (demoPhaseRef.current !== "waitingForFailover" && demoPhaseRef.current !== "timeout")
      ) {
        return;
      }

      timeoutIdRef.current = window.setTimeout(() => {
        void refreshSnapshot();
      }, delayMs);
    }

    async function refreshSnapshot() {
      if (!isActive || isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      let nextDelayMs = POLL_INTERVAL_MS;
      const requestController = new AbortController();
      requestControllerRef.current = requestController;
      const abortTimeoutId = window.setTimeout(() => {
        requestController.abort();
      }, POLL_TIMEOUT_MS);

      try {
        const nextSnapshot = await fetchLatestSnapshot(pollUrl, requestController);
        if (!isActive) {
          return;
        }

        const nextChanges = collectRoutingChanges(snapshotRef.current, nextSnapshot);
        const baseline = baselineSnapshotRef.current ?? snapshotRef.current;
        const failoverDetected =
          baseline.webRuntime.instanceId !== nextSnapshot.webRuntime.instanceId;
        const elapsedMs =
          runStartedAtMsRef.current === null ? 0 : Date.now() - runStartedAtMsRef.current;

        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        setPollState("live");
        setClockNow(Date.now());

        if (!nextSnapshot.api.connected) {
          setInterruptionObserved(true);
        }

        if (nextChanges.length > 0) {
          setChanges((current) => [...nextChanges, ...current].slice(0, 6));
        }

        if (failoverDetected) {
          setCompletedAt((current) => current ?? new Date().toISOString());
          setDemoPhase("completed");
          return;
        }

        if (elapsedMs >= DEMO_TIMEOUT_MS && demoPhaseRef.current === "waitingForFailover") {
          setDemoPhase("timeout");
        }
      } catch {
        if (!isActive) {
          return;
        }

        setPollState("reconnecting");
        setInterruptionObserved(true);
        nextDelayMs = RECONNECT_INTERVAL_MS;

        if (
          runStartedAtMsRef.current !== null &&
          Date.now() - runStartedAtMsRef.current >= DEMO_TIMEOUT_MS &&
          demoPhaseRef.current === "waitingForFailover"
        ) {
          setDemoPhase("timeout");
        }
      } finally {
        window.clearTimeout(abortTimeoutId);
        isRefreshingRef.current = false;
        requestControllerRef.current = null;
        scheduleNextRefresh(nextDelayMs);
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
  }, [demoPhase, pollUrl]);

  const isInProgress = demoPhase === "capturingBaseline" || demoPhase === "waitingForFailover";
  const failoverDetected =
    baselineSnapshot !== null &&
    baselineSnapshot.webRuntime.instanceId !== snapshot.webRuntime.instanceId;
  const elapsedLabel = getElapsedLabel({
    completedAt,
    currentPhase: demoPhase,
    nowMs: clockNow,
    startedAt,
  });
  const flowSteps = buildFlowSteps({
    baselineSnapshot,
    demoPhase,
    interruptionObserved,
    snapshot,
  });
  const heroCopy = getHeroCopy({
    baselineSnapshot,
    demoPhase,
    elapsedLabel,
    interruptionObserved,
    pollState,
    snapshot,
    startedAt,
  });

  async function handleStartDemo() {
    if (
      demoPhaseRef.current === "capturingBaseline" ||
      demoPhaseRef.current === "waitingForFailover"
    ) {
      return;
    }

    setDemoPhase("capturingBaseline");
    setActionError(null);
    setPollState("idle");
    setChanges([]);
    setCompletedAt(null);
    setInterruptionObserved(false);
    setClockNow(Date.now());

    let nextBaseline = snapshotRef.current;

    try {
      nextBaseline = await fetchLatestSnapshot(pollUrl);
    } catch {
      setPollState("reconnecting");
    }

    snapshotRef.current = nextBaseline;
    baselineSnapshotRef.current = nextBaseline;
    setSnapshot(nextBaseline);
    setBaselineSnapshot(nextBaseline);

    try {
      await recycleActiveWebPod(nextBaseline.webRuntime);
    } catch (error) {
      setStartedAt(null);
      setDemoPhase("idle");
      setActionError(
        error instanceof Error ? error.message : "Unable to recycle the active ClubCRM web pod."
      );
      return;
    }

    runStartedAtMsRef.current = Date.now();
    setStartedAt(new Date().toISOString());
    setDemoPhase("waitingForFailover");
  }

  return (
    <section className="rounded-[1.75rem] border border-brand-border bg-brand-surface p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand">
            Audience screen
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Follow ClubCRM traffic as it fails over to a healthy replacement server
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              This public page turns live routing snapshots into a presentation-first failover
              story. The presenter console is the canonical place to run the server restart demo;
              this button remains available as a faster pod-recycle rehearsal path.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex flex-wrap gap-3">
            <StatusBadge
              label={`API ${snapshot.api.connected ? "connected" : "offline"}`}
              tone={snapshot.api.connected ? "success" : "critical"}
            />
            <StatusBadge
              label={pollState === "reconnecting" ? "Signal interrupted" : "Live snapshots"}
              tone={pollState === "reconnecting" ? "warning" : "success"}
            />
          </div>
          <Button
            aria-busy={isInProgress}
            className="min-w-56 justify-center"
            disabled={isInProgress}
            onClick={() => {
              void handleStartDemo();
            }}
            type="button"
            variant="secondary"
          >
            {isInProgress ? (
              <>
                <Spinner />
                Pod recycle in progress
              </>
            ) : (
              heroCopy.buttonLabel
            )}
          </Button>
        </div>
      </div>

      {actionError ? (
        <div className="mt-6 rounded-[1.2rem] border border-warning/40 bg-warning/10 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Failover trigger could not start</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionError}</p>
        </div>
      ) : null}

      <div className="mt-6 rounded-[1.6rem] border border-brand-emphasis/30 bg-background/90 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.05)] transition-colors">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={heroCopy.badge} tone={heroCopy.badgeTone} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Client-side run state
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-5xl font-semibold tracking-tight text-foreground transition-colors sm:text-6xl">
                {heroCopy.headline}
              </p>
              <p className="text-lg font-medium text-foreground">{heroCopy.title}</p>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {heroCopy.description}
              </p>
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-brand-border/80 bg-brand-surface px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current route
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {getServerLabel(snapshot.webRuntime)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pod {getTechnicalLabel(snapshot.webRuntime)}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            detail={
              baselineSnapshot
                ? `Pod ${getTechnicalLabel(baselineSnapshot.webRuntime)}`
                : "Will lock when the rehearsal starts."
            }
            label="Baseline server"
            value={baselineSnapshot ? getServerLabel(baselineSnapshot.webRuntime) : "Waiting"}
          />
          <SummaryStat
            detail={`Pod ${getTechnicalLabel(snapshot.webRuntime)}`}
            label="Current server"
            value={getServerLabel(snapshot.webRuntime)}
          />
          <SummaryStat
            detail={snapshot.api.endpoint}
            label="API status"
            value={snapshot.api.connected ? "Connected" : "Offline"}
          />
          <SummaryStat
            detail={
              startedAt
                ? `Run started ${formatTimestamp(startedAt)}`
                : "Starts when you trigger the pod recycle run."
            }
            label={
              failoverDetected
                ? "Time to reroute"
                : demoPhase === "idle"
                  ? "Failover timer"
                  : "Elapsed run time"
            }
            value={elapsedLabel}
          />
        </dl>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {flowSteps.map((step, index) => (
          <FlowStepCard
            key={step.title}
            description={step.description}
            index={index + 1}
            title={step.title}
            tone={step.tone}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RuntimeCard
          description="This is the server and pod the public route is currently reaching. The server label is the primary audience signal; pod details stay here as supporting evidence."
          instance={snapshot.webRuntime}
          title="Browser entry server"
        />
        <RuntimeCard
          description={`Reference signal only. This shows the API runtime behind the health endpoint. Status: ${snapshot.api.status} • ${snapshot.api.endpoint}`}
          instance={snapshot.api.runtime}
          title="API upstream server"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-5">
          <p className="text-sm font-medium text-foreground">Run status</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {startedAt ? formatTimestamp(startedAt) : "Ready to start"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{heroCopy.supportingText}</p>
        </div>
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Observed changes</p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {changes.length} logged
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {changes.length > 0 ? (
              changes.map((change) => (
                <div
                  key={change.id}
                  className="rounded-[1rem] border border-brand-border/70 bg-brand-surface px-4 py-3 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{change.message}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {formatTimestamp(change.recordedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-brand-border/80 px-4 py-6 text-sm text-muted-foreground">
                {demoPhase === "idle"
                  ? "Start the fallback pod recycle demo to capture a baseline and begin watching the route."
                  : "No routing handoff has been observed yet."}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

async function fetchLatestSnapshot(pollUrl: string, requestController?: AbortController) {
  const controller = requestController ?? new AbortController();
  const response = await fetch(buildPollUrl(pollUrl), {
    cache: "no-store",
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`Live routing request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as LiveRoutingSnapshot;
}

async function recycleActiveWebPod(runtime: RuntimeInstance) {
  if (!runtime.namespace || !runtime.podName) {
    throw new Error("The current web pod does not expose a recyclable Kubernetes target yet.");
  }

  const response = await fetch("/demo/failover/recycle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      namespace: runtime.namespace,
      podName: runtime.podName,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { detail?: string };
  if (!response.ok) {
    throw new Error(payload.detail ?? "Unable to recycle the active ClubCRM web pod.");
  }
}

function buildPollUrl(pollUrl: string) {
  const url = new URL(pollUrl, window.location.origin);
  url.searchParams.set("ts", Date.now().toString());

  return url.toString();
}

function buildFlowSteps({
  baselineSnapshot,
  demoPhase,
  interruptionObserved,
  snapshot,
}: {
  baselineSnapshot: LiveRoutingSnapshot | null;
  demoPhase: DemoPhase;
  interruptionObserved: boolean;
  snapshot: LiveRoutingSnapshot;
}) {
  const failoverDetected =
    baselineSnapshot !== null &&
    baselineSnapshot.webRuntime.instanceId !== snapshot.webRuntime.instanceId;

  return [
    {
      title: "Baseline captured",
      description:
        baselineSnapshot === null
          ? "Store the active server before the public fallback demo recycles its pod."
          : `Baseline locked to ${getServerLabel(baselineSnapshot.webRuntime)}.`,
      tone:
        baselineSnapshot === null
          ? demoPhase === "capturingBaseline"
            ? "active"
            : "pending"
          : "complete",
    },
    {
      title: "Failover triggered",
      description:
        demoPhase === "idle"
          ? "This audience route can run a fallback pod recycle demo. Use the monitor dashboard for the full server failover presentation path."
          : "The pod recycle trigger was sent from this public rehearsal screen.",
      tone:
        demoPhase === "waitingForFailover" || demoPhase === "timeout"
          ? "active"
          : demoPhase === "completed"
            ? "complete"
            : "pending",
    },
    {
      title: "Disruption observed",
      description: interruptionObserved
        ? "Live routing briefly degraded or reconnected before the route settled again."
        : demoPhase === "waitingForFailover" || demoPhase === "timeout"
          ? "Watching for a brief interruption while traffic moves to a healthy replacement server."
          : "The screen will call out any reconnect or API disruption during the run.",
      tone: interruptionObserved
        ? failoverDetected
          ? "complete"
          : "active"
        : demoPhase === "timeout"
          ? "warning"
          : demoPhase === "waitingForFailover"
            ? "active"
            : "pending",
    },
    {
      title: "Recovery confirmed",
      description: failoverDetected
        ? `Traffic recovered on ${getServerLabel(snapshot.webRuntime)}.`
        : demoPhase === "timeout"
          ? "The guided timer expired, but the page is still polling so the eventual recovery can remain visible."
          : "The run finishes once the browser route lands on a different server.",
      tone: failoverDetected ? "complete" : demoPhase === "timeout" ? "warning" : "pending",
    },
  ] satisfies Array<{
    title: string;
    description: string;
    tone: StepTone;
  }>;
}

function getHeroCopy({
  baselineSnapshot,
  demoPhase,
  elapsedLabel,
  interruptionObserved,
  pollState,
  snapshot,
  startedAt,
}: {
  baselineSnapshot: LiveRoutingSnapshot | null;
  demoPhase: DemoPhase;
  elapsedLabel: string;
  interruptionObserved: boolean;
  pollState: PollState;
  snapshot: LiveRoutingSnapshot;
  startedAt: string | null;
}) {
  const failoverDetected =
    baselineSnapshot !== null &&
    baselineSnapshot.webRuntime.instanceId !== snapshot.webRuntime.instanceId;
  const currentServer = getServerLabel(snapshot.webRuntime);
  const baselineServer = getServerLabel(baselineSnapshot?.webRuntime ?? null);

  if (demoPhase === "completed" && failoverDetected) {
    return {
      badge: "Recovery confirmed",
      badgeTone: "success" as const,
      buttonLabel: "Run pod recycle demo again",
      headline: currentServer,
      title: "Traffic recovered on a replacement server.",
      description: `The browser route moved from ${baselineServer} to ${currentServer}. This run is derived from live routing snapshots, so the screen stays grounded in the same signal the audience is watching.`,
      supportingText: `Recovery completed in ${elapsedLabel}. You can rerun the public fallback flow at any time, but the presenter console remains the canonical place to trigger the full server failover demo.`,
    };
  }

  if (demoPhase === "timeout") {
    return {
      badge: "Run timed out",
      badgeTone: "warning" as const,
      buttonLabel: "Run pod recycle demo again",
      headline: currentServer,
      title: "The guided timer expired before a route handoff was confirmed.",
      description:
        "The page keeps polling the live routing endpoint, so any later recovery still appears on screen even though the guided run has timed out.",
      supportingText:
        "Use the presenter console to check server readiness, then restart the demo when you are ready for another pass.",
    };
  }

  if (demoPhase === "waitingForFailover") {
    return {
      badge: pollState === "reconnecting" ? "Disruption observed" : "Watching failover",
      badgeTone:
        pollState === "reconnecting" || interruptionObserved
          ? ("warning" as const)
          : ("success" as const),
      buttonLabel: "Pod recycle demo in progress",
      headline: baselineServer,
      title:
        pollState === "reconnecting"
          ? "The route is reconnecting after the trigger."
          : "Baseline captured. Waiting for traffic to move.",
      description: `The run started ${startedAt ? `at ${formatTimestamp(startedAt)}` : "just now"}. This public screen is watching for the browser route to leave ${baselineServer} and settle on a healthy replacement server.`,
      supportingText:
        "This page derives its run state from live routing snapshots only. It does not coordinate with a backend run session, so reconnects and elapsed time are tracked client-side.",
    };
  }

  if (demoPhase === "capturingBaseline") {
    return {
      badge: "Capturing baseline",
      badgeTone: "warning" as const,
      buttonLabel: "Pod recycle demo in progress",
      headline: getServerLabel(snapshot.webRuntime),
      title: "Locking the current server before the rehearsal begins.",
      description:
        "The page is taking one last routing sample so the audience can compare the original server with the eventual recovery target.",
      supportingText:
        "As soon as the latest snapshot arrives, this screen will trigger the public fallback pod recycle path.",
    };
  }

  return {
    badge: "Ready",
    badgeTone: "warning" as const,
    buttonLabel: "Run pod recycle demo",
    headline: currentServer,
    title: "The audience screen is ready for a guided failover story.",
    description:
      "Use this route to rehearse the public narrative. For the real networking presentation, start the canonical server failover from the monitor dashboard and leave this screen projected for the audience.",
    supportingText:
      "Nothing is running yet. Starting this fallback path captures the current server, recycles the active pod, and watches for the route to recover.",
  };
}

function FlowStepCard({
  description,
  index,
  title,
  tone,
}: {
  description: string;
  index: number;
  title: string;
  tone: StepTone;
}) {
  return (
    <article
      className={cn(
        "rounded-[1.25rem] border p-4 transition-colors",
        tone === "complete" && "border-success-border bg-success/40",
        tone === "active" &&
          "border-brand-emphasis bg-background shadow-[0_14px_30px_rgba(15,23,42,0.06)]",
        tone === "pending" && "border-brand-border/80 bg-background/65",
        tone === "warning" && "border-warning-border bg-warning/45"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
            tone === "complete" && "bg-success-solid text-white",
            tone === "active" && "bg-brand text-brand-foreground animate-pulse",
            tone === "pending" && "bg-brand-border/70 text-brand-foreground",
            tone === "warning" && "bg-warning-solid text-warning-foreground"
          )}
        >
          {index}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </article>
  );
}

function SummaryStat({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-brand-border/80 bg-brand-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-lg font-semibold text-foreground">{value}</dd>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
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
  const serverLabel = getServerLabel(instance);

  return (
    <article className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
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

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-brand-border/70 bg-brand-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-all text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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

function getElapsedLabel({
  completedAt,
  currentPhase,
  nowMs,
  startedAt,
}: {
  completedAt: string | null;
  currentPhase: DemoPhase;
  nowMs: number;
  startedAt: string | null;
}) {
  if (!startedAt) {
    return currentPhase === "idle" ? "Standing by" : "Starting";
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return "Unavailable";
  }

  const endMs = completedAt ? new Date(completedAt).getTime() : nowMs;
  const elapsedMs = Math.max(0, endMs - startedAtMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

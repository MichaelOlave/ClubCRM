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
const DEMO_TIMEOUT_MS = 45000;

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
  const [sampleCount, setSampleCount] = useState(0);
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
    if (demoPhase !== "waitingForFailover") {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current);
      }

      requestControllerRef.current?.abort();
      return;
    }

    let isActive = true;

    function scheduleNextRefresh(delayMs = POLL_INTERVAL_MS) {
      if (!isActive || demoPhaseRef.current !== "waitingForFailover") {
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
        setSampleCount((current) => current + 1);

        if (nextChanges.length > 0) {
          setChanges((current) => [...nextChanges, ...current].slice(0, 6));
        }

        if (failoverDetected) {
          setDemoPhase("completed");
          return;
        }

        if (elapsedMs >= DEMO_TIMEOUT_MS) {
          setDemoPhase("timeout");
          return;
        }
      } catch {
        if (!isActive) {
          return;
        }

        setPollState("reconnecting");
        nextDelayMs = RECONNECT_INTERVAL_MS;

        if (
          runStartedAtMsRef.current !== null &&
          Date.now() - runStartedAtMsRef.current >= DEMO_TIMEOUT_MS
        ) {
          setDemoPhase("timeout");
          return;
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
  const flowSteps = buildFlowSteps({
    baselineSnapshot,
    demoPhase,
    sampleCount,
    snapshot,
  });
  const heroCopy = getHeroCopy({
    baselineSnapshot,
    demoPhase,
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
    setSampleCount(0);

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
    <section className="rounded-[1.5rem] border border-brand-border bg-brand-surface p-6 sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand">Demo flow</p>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Start the failover sequence with one button press
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Capture the current browser entry pod, trigger the live pod recycle, and let this page
              confirm when traffic lands on a replacement pod. The button stays locked while a run
              is already in progress.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex flex-wrap gap-3">
            <StatusBadge label={heroCopy.badge} tone={heroCopy.badgeTone} />
            <StatusBadge
              label={`API ${snapshot.api.connected ? "connected" : "offline"}`}
              tone={snapshot.api.connected ? "success" : "critical"}
            />
          </div>
          <Button
            aria-busy={isInProgress}
            className="min-w-52 justify-center"
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
                Demo in progress
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

      <div className="mt-6 rounded-[1.35rem] border border-brand-border/80 bg-background/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-foreground">{heroCopy.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{heroCopy.description}</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <SummaryStat
              label="Baseline pod"
              value={getPrimaryLabel(baselineSnapshot?.webRuntime ?? null)}
            />
            <SummaryStat label="Current pod" value={getPrimaryLabel(snapshot.webRuntime)} />
            <SummaryStat
              label="Samples"
              value={sampleCount > 0 ? `${sampleCount}` : demoPhase === "idle" ? "Waiting" : "0"}
            />
          </dl>
        </div>
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
          description="This is the pod the browser is currently reaching through the public route."
          instance={snapshot.webRuntime}
          title="Browser entry pod"
        />
        <RuntimeCard
          description={`Status: ${snapshot.api.status} • ${snapshot.api.endpoint}`}
          instance={snapshot.api.runtime}
          title="API upstream pod"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-4">
          <p className="text-sm font-medium text-foreground">Run status</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {startedAt ? formatTimestamp(startedAt) : "Ready to start"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{heroCopy.supportingText}</p>
        </div>
        <div className="rounded-[1.25rem] border border-brand-border/80 bg-background/70 p-4">
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
                {demoPhase === "idle"
                  ? "Press start to capture a baseline and begin watching for a pod switch."
                  : "No routing change has been observed yet."}
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
  sampleCount,
  snapshot,
}: {
  baselineSnapshot: LiveRoutingSnapshot | null;
  demoPhase: DemoPhase;
  sampleCount: number;
  snapshot: LiveRoutingSnapshot;
}) {
  const failoverDetected =
    baselineSnapshot !== null &&
    baselineSnapshot.webRuntime.instanceId !== snapshot.webRuntime.instanceId;

  return [
    {
      title: "Capture baseline",
      description:
        baselineSnapshot === null
          ? "Store the active browser-entry pod before anyone recycles it."
          : `Baseline locked to ${getPrimaryLabel(baselineSnapshot.webRuntime)}.`,
      tone:
        baselineSnapshot === null
          ? demoPhase === "capturingBaseline"
            ? "active"
            : "pending"
          : "complete",
    },
    {
      title: "Recycle pod",
      description:
        demoPhase === "idle"
          ? "The public demo route will recycle the current web pod after it captures the baseline."
          : "Recycle the current web pod from the networking control panel.",
      tone:
        demoPhase === "waitingForFailover"
          ? "active"
          : demoPhase === "completed" || demoPhase === "timeout"
            ? "complete"
            : "pending",
    },
    {
      title: "Watch reroute",
      description:
        sampleCount > 0
          ? `Collected ${sampleCount} live sample${sampleCount === 1 ? "" : "s"} while waiting for a switch.`
          : "Poll the public route until the browser lands on a new pod.",
      tone: failoverDetected
        ? "complete"
        : demoPhase === "waitingForFailover"
          ? "active"
          : demoPhase === "timeout"
            ? "warning"
            : "pending",
    },
    {
      title: "Confirm replacement",
      description: failoverDetected
        ? `Traffic moved to ${getPrimaryLabel(snapshot.webRuntime)}.`
        : demoPhase === "timeout"
          ? "No replacement pod was detected before the demo timer expired."
          : "The run finishes once a different browser-entry pod appears.",
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
  pollState,
  snapshot,
  startedAt,
}: {
  baselineSnapshot: LiveRoutingSnapshot | null;
  demoPhase: DemoPhase;
  pollState: PollState;
  snapshot: LiveRoutingSnapshot;
  startedAt: string | null;
}) {
  const failoverDetected =
    baselineSnapshot !== null &&
    baselineSnapshot.webRuntime.instanceId !== snapshot.webRuntime.instanceId;

  if (demoPhase === "completed" && failoverDetected) {
    return {
      badge: "Failover confirmed",
      badgeTone: "success" as const,
      buttonLabel: "Run again",
      title: "The public route moved to a replacement pod.",
      description: `The browser entry changed from ${getPrimaryLabel(baselineSnapshot?.webRuntime ?? null)} to ${getPrimaryLabel(snapshot.webRuntime)} without reloading the page.`,
      supportingText:
        "You can start another run at any time to repeat the sequence for the audience.",
    };
  }

  if (demoPhase === "timeout") {
    return {
      badge: "Run timed out",
      badgeTone: "warning" as const,
      buttonLabel: "Try again",
      title: "The demo window expired before a pod switch was observed.",
      description:
        "The page kept polling, but it never saw the browser entry move to a replacement pod within the current run.",
      supportingText:
        "Check the monitoring dashboard, then restart the demo when you are ready for another pass.",
    };
  }

  if (demoPhase === "waitingForFailover") {
    return {
      badge: pollState === "reconnecting" ? "Waiting to reconnect" : "Watching live",
      badgeTone: pollState === "reconnecting" ? ("warning" as const) : ("success" as const),
      buttonLabel: "Demo in progress",
      title: "Baseline captured. Waiting for the failover event.",
      description: `The run started ${startedAt ? `at ${formatTimestamp(startedAt)}` : "just now"}. Recycle ${getPrimaryLabel(baselineSnapshot?.webRuntime ?? null)} and this page will confirm the replacement pod once it appears.`,
      supportingText:
        "Keep the iframe open while the networking demo triggers the pod recycle from the companion dashboard.",
    };
  }

  if (demoPhase === "capturingBaseline") {
    return {
      badge: "Preparing run",
      badgeTone: "warning" as const,
      buttonLabel: "Demo in progress",
      title: "Capturing the current pod before the failover test begins.",
      description:
        "This short setup step stores the pod that is live before the recycle action happens.",
      supportingText:
        "The run will begin automatically as soon as the latest routing sample arrives.",
    };
  }

  return {
    badge: "Ready",
    badgeTone: "warning" as const,
    buttonLabel: "Start failover demo",
    title: "The page is standing by for a guided failover run.",
    description:
      "Use a single button press to capture the baseline pod, trigger the recycle, and watch for the reroute.",
    supportingText:
      "Nothing is polling yet. Starting the run captures the baseline pod and begins the live checks.",
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
            "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            tone === "complete" && "bg-success-solid text-white",
            tone === "active" && "bg-brand text-brand-foreground",
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-brand-border/80 bg-brand-surface px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-all text-sm font-semibold text-foreground">{value}</dd>
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

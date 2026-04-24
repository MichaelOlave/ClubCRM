import type { ClusterEvent } from "@/features/cluster/types";

const KIND_LABEL: Record<ClusterEvent["kind"], string> = {
  NODE_READY: "Node ready",
  NODE_DOWN: "Node down",
  POD_CREATED: "Pod created",
  POD_MOVED: "Pod moved",
  POD_CRASHED: "Pod crashed",
  POD_DELETED: "Pod deleted",
  POD_STATUS: "Pod status",
  VOLUME_ATTACHED: "Volume attached",
  VOLUME_DETACHED: "Volume detached",
  VOLUME_REATTACHED: "Volume moved",
  VOLUME_FAULTED: "Volume faulted",
  VOLUME_HEALTH_CHANGED: "Volume health",
  REPLICA_HEALTH_CHANGED: "Replica health",
  PROBE_OK: "Probe ok",
  PROBE_DEGRADED: "Probe degraded",
  PROBE_FAILED: "Probe failed",
  K8S_WARNING: "K8s warning",
  CHAOS_STARTED: "Chaos started",
  CHAOS_ENDED: "Chaos ended",
};

const KIND_COLOR: Record<ClusterEvent["kind"], string> = {
  NODE_READY: "text-emerald-300",
  NODE_DOWN: "text-red-300",
  POD_CREATED: "text-sky-300",
  POD_MOVED: "text-violet-300",
  POD_CRASHED: "text-red-300",
  POD_DELETED: "text-zinc-400",
  POD_STATUS: "text-yellow-300",
  VOLUME_ATTACHED: "text-cyan-300",
  VOLUME_DETACHED: "text-zinc-300",
  VOLUME_REATTACHED: "text-sky-300",
  VOLUME_FAULTED: "text-red-300",
  VOLUME_HEALTH_CHANGED: "text-amber-300",
  REPLICA_HEALTH_CHANGED: "text-cyan-300",
  PROBE_OK: "text-emerald-300",
  PROBE_DEGRADED: "text-amber-300",
  PROBE_FAILED: "text-red-300",
  K8S_WARNING: "text-amber-400",
  CHAOS_STARTED: "text-purple-400",
  CHAOS_ENDED: "text-zinc-400",
};

const CAUSE_TAG: Partial<Record<ClusterEvent["kind"], string>> = {
  K8S_WARNING: "cause",
  CHAOS_STARTED: "chaos",
  CHAOS_ENDED: "chaos",
  PROBE_DEGRADED: "service",
  PROBE_FAILED: "service",
};

const CAUSE_TAG_STYLE: Partial<Record<ClusterEvent["kind"], string>> = {
  K8S_WARNING: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  CHAOS_STARTED: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  CHAOS_ENDED: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  PROBE_DEGRADED: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  PROBE_FAILED: "border-red-500/40 bg-red-500/10 text-red-300",
};

const CAUSE_BORDER: Partial<Record<ClusterEvent["kind"], string>> = {
  K8S_WARNING: "border-amber-500/30",
  CHAOS_STARTED: "border-purple-500/30",
  CHAOS_ENDED: "border-zinc-500/20",
  PROBE_DEGRADED: "border-amber-500/30",
  PROBE_FAILED: "border-red-500/30",
};

export function EventFeed({ events }: { events: ClusterEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-2 opacity-50">
        <p className="text-sm font-medium text-zinc-400">Listening for cluster activity</p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">waiting for frames...</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 overflow-visible">
      {events.slice(0, 50).map((event, index) => {
        const causeTag = CAUSE_TAG[event.kind];
        const causeTagStyle = CAUSE_TAG_STYLE[event.kind];
        const causeBorder = CAUSE_BORDER[event.kind] ?? "border-white/5";
        return (
          <li
            key={`${event.kind}-${event.ts}-${index}`}
            className={`group relative flex flex-col gap-1.5 rounded-lg border ${causeBorder} bg-zinc-900/40 p-3 transition-all hover:bg-zinc-900/60`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.1em] ${KIND_COLOR[event.kind]}`}
                >
                  {KIND_LABEL[event.kind]}
                </span>
                {causeTag && causeTagStyle && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${causeTagStyle}`}
                  >
                    {causeTag}
                  </span>
                )}
              </div>
              <time
                suppressHydrationWarning
                className="font-mono text-[9px] font-medium text-zinc-600 transition-colors group-hover:text-zinc-400"
              >
                {new Date(event.ts * 1000).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-zinc-200 antialiased">
              {summarize(event)}
            </p>

            {/* Subtle left border for severity */}
            <div
              className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${KIND_COLOR[event.kind].replace("text-", "bg-").split("/")[0]}`}
            />
          </li>
        );
      })}
    </ul>
  );
}

function summarize(event: ClusterEvent): string {
  switch (event.kind) {
    case "NODE_READY":
    case "NODE_DOWN":
      return event.node;
    case "POD_CREATED":
      return `${event.namespace}/${event.name} → ${event.node_name ?? "(unscheduled)"}`;
    case "POD_MOVED":
      return `${event.namespace}/${event.name}: ${event.from_node ?? "(none)"} → ${event.to_node ?? "(none)"}`;
    case "POD_CRASHED":
      return `${event.namespace}/${event.name} (${event.reason})`;
    case "POD_DELETED":
      return `${event.namespace}/${event.name}`;
    case "POD_STATUS":
      return `${event.namespace}/${event.name}: ${event.from_status} → ${event.to_status}`;
    case "VOLUME_ATTACHED":
      return `${event.volume} → ${event.node_name ?? "(detached)"}`;
    case "VOLUME_DETACHED":
      return `${event.volume}: ${event.from_node ?? "(none)"} → detached`;
    case "VOLUME_REATTACHED":
      return `${event.volume}: ${event.from_node ?? "(none)"} → ${event.to_node ?? "(none)"}`;
    case "VOLUME_FAULTED":
      return `${event.volume} faulted on ${event.node_name ?? "(unknown node)"}`;
    case "VOLUME_HEALTH_CHANGED":
      return `${event.volume}: ${event.from_health} → ${event.to_health}`;
    case "REPLICA_HEALTH_CHANGED":
      return `${event.replica} (${event.volume}): ${event.from_health} → ${event.to_health}`;
    case "PROBE_OK":
      return `${event.service}: ${Math.round(event.latency_ms)} ms (${event.status_code})`;
    case "PROBE_DEGRADED":
      return `${event.service}: ${event.reason}`;
    case "PROBE_FAILED":
      return `${event.service}: ${event.error}`;
    case "K8S_WARNING":
      return `${event.involved_object_kind}/${event.involved_object_name}: ${event.reason} — ${event.message.slice(0, 80)}`;
    case "CHAOS_STARTED":
      return `${event.experiment_kind} ${event.namespace}/${event.name}`;
    case "CHAOS_ENDED":
      return `${event.experiment_kind} ${event.namespace}/${event.name} ended`;
  }
}

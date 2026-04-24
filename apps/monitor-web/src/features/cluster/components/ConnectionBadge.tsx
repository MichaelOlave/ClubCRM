import type { StreamStatus } from "@/features/cluster/types";

const LABEL: Record<StreamStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
  replay: "Replay",
  paused: "Paused",
};

const COLOR: Record<StreamStatus, string> = {
  connecting: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  live: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  reconnecting: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  offline: "bg-zinc-500/20 text-zinc-300 border-zinc-400/40",
  replay: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  paused: "bg-zinc-500/20 text-zinc-300 border-zinc-400/40",
};

export function ConnectionBadge({ status }: { status: StreamStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${COLOR[status]}`}
      role="status"
      aria-label={`Stream status: ${LABEL[status]}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status === "live" || status === "replay" ? "bg-current animate-pulse" : "bg-current"
        }`}
      />
      {LABEL[status]}
    </span>
  );
}

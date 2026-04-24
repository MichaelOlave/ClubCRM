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
  const isLive = status === "live" || status === "replay";

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border bg-zinc-950/50 px-3.5 py-1.5 backdrop-blur-md shadow-lg ${COLOR[status]}`}
      role="status"
      aria-label={`Stream status: ${LABEL[status]}`}
    >
      <div className="relative flex h-2 w-2">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{LABEL[status]}</span>
    </div>
  );
}

"use client";

import { useClusterStream } from "@/features/cluster/hooks/useClusterStream";
import { ClusterGraph } from "@/features/cluster/components/ClusterGraph";
import { ConnectionBadge } from "@/features/cluster/components/ConnectionBadge";
import { EventFeed } from "@/features/cluster/components/EventFeed";
import { ReplayControls } from "@/features/cluster/components/ReplayControls";
import { ServiceHealthPanel } from "@/features/cluster/components/ServiceHealthPanel";
import { StorageHealthPanel } from "@/features/cluster/components/StorageHealthPanel";
import type { ClusterEvent, ClusterReplay, ClusterSnapshot } from "@/features/cluster/types";

interface ClusterDashboardProps {
  initialSnapshot: ClusterSnapshot;
  replaySession?: ClusterReplay | null;
  streamUrl: string;
}

export function ClusterDashboard({
  initialSnapshot,
  replaySession,
  streamUrl,
}: ClusterDashboardProps) {
  const { cluster, eventLog, replay, streamStatus } = useClusterStream(
    initialSnapshot,
    streamUrl,
    replaySession
  );
  const recentMoves = eventLog.filter(
    (event): event is Extract<ClusterEvent, { kind: "POD_MOVED" }> => event.kind === "POD_MOVED"
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400">Cluster view</p>
          <h2 className="text-2xl font-semibold text-zinc-100">
            {cluster.nodes.length} nodes · {cluster.pods.length} pods · {cluster.volumes.length}{" "}
            volumes · {cluster.probes.length} services
          </h2>
        </div>
        <ConnectionBadge status={streamStatus} />
      </div>

      {replay.active && (
        <ReplayControls
          currentFrame={replay.currentFrame}
          paused={replay.paused}
          totalFrames={replay.totalFrames}
          onRestart={replay.restart}
          onTogglePaused={replay.togglePaused}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ClusterGraph state={cluster} recentMoves={recentMoves} />
        <aside className="flex flex-col gap-4">
          <ServiceHealthPanel probes={cluster.probes} />
          <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
            <header>
              <p className="text-xs uppercase tracking-wider text-zinc-400">Event feed</p>
              <h3 className="text-lg font-semibold text-zinc-100">Recent transitions</h3>
            </header>
            <div className="mt-3">
              <EventFeed events={eventLog} />
            </div>
          </div>
          <StorageHealthPanel volumes={cluster.volumes} replicas={cluster.replicas} />
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useClusterStream } from "@/features/cluster/hooks/useClusterStream";
import { ClusterGraph } from "@/features/cluster/components/ClusterGraph";
import { ConnectionBadge } from "@/features/cluster/components/ConnectionBadge";
import { EventFeed } from "@/features/cluster/components/EventFeed";
import { ServiceHealthPanel } from "@/features/cluster/components/ServiceHealthPanel";
import { StorageHealthPanel } from "@/features/cluster/components/StorageHealthPanel";
import { TimelineControls } from "@/features/cluster/components/TimelineControls";
import {
  countEventsByCategory,
  EVENT_CATEGORIES,
  isEventVisible,
  type ClusterEventCategory,
} from "@/features/cluster/lib/eventFilters";
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
  const { cluster, eventLog, replay, streamControls, streamStatus } = useClusterStream(
    initialSnapshot,
    streamUrl,
    replaySession
  );
  const [selectedCategories, setSelectedCategories] = useState<ClusterEventCategory[]>(
    EVENT_CATEGORIES.slice()
  );
  const visibleEvents = eventLog.filter((event) => isEventVisible(event, selectedCategories));
  const recentMoves = visibleEvents.filter(
    (event): event is Extract<ClusterEvent, { kind: "POD_MOVED" }> => event.kind === "POD_MOVED"
  );
  const countsByCategory = countEventsByCategory(eventLog);

  const toggleCategory = (category: ClusterEventCategory) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((entry) => entry !== category);
      }

      return [...current, category];
    });
  };

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

      <TimelineControls
        countsByCategory={countsByCategory}
        currentFrame={replay.currentFrame}
        isReplay={replay.active}
        onRestart={replay.active ? replay.restart : undefined}
        onSelectAllCategories={() => setSelectedCategories(EVENT_CATEGORIES.slice())}
        onToggleCategory={toggleCategory}
        onTogglePaused={streamControls.togglePaused}
        paused={streamControls.paused}
        queuedFrames={streamControls.queuedFrames}
        selectedCategories={selectedCategories}
        totalFrames={replay.totalFrames}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ClusterGraph state={cluster} recentMoves={recentMoves} />
        <aside className="flex flex-col gap-4">
          <ServiceHealthPanel probes={cluster.probes} />
          <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
            <header>
              <p className="text-xs uppercase tracking-wider text-zinc-400">Event feed</p>
              <h3 className="text-lg font-semibold text-zinc-100">
                Recent transitions
                <span className="ml-2 text-sm font-normal text-zinc-400">
                  {visibleEvents.length} shown
                </span>
              </h3>
            </header>
            <div className="mt-3">
              <EventFeed events={visibleEvents} />
            </div>
          </div>
          <StorageHealthPanel volumes={cluster.volumes} replicas={cluster.replicas} />
        </aside>
      </div>
    </div>
  );
}

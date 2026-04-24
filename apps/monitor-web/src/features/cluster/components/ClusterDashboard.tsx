"use client";

import { useState } from "react";
import { useClusterStream } from "@/features/cluster/hooks/useClusterStream";
import { ClusterGraph } from "@/features/cluster/components/ClusterGraph";
import { ClusterStatsBar } from "@/features/cluster/components/ClusterStatsBar";
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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <ClusterStatsBar state={cluster} />
        <div className="flex items-center gap-4 self-end lg:self-auto">
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
          <ConnectionBadge status={streamStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px_350px]">
        {/* Main Column: Graph */}
        <div className="min-w-0 space-y-6">
          <ClusterGraph state={cluster} recentMoves={recentMoves} />
        </div>

        {/* Middle Column: Event Feed */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-zinc-900/30 p-5 backdrop-blur-md">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                Timeline
              </p>
              <h3 className="text-lg font-semibold text-zinc-100">Live transitions</h3>
            </div>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {visibleEvents.length} frames
            </span>
          </header>
          <div className="relative flex-1 overflow-hidden rounded-xl border border-white/5 bg-black/20">
            <div className="absolute inset-0 overflow-y-auto p-2">
              <EventFeed events={visibleEvents} />
            </div>
          </div>
        </div>

        {/* Right Column: Health Panels */}
        <aside className="flex flex-col gap-6">
          <ServiceHealthPanel probes={cluster.probes} />
          <StorageHealthPanel volumes={cluster.volumes} replicas={cluster.replicas} />
        </aside>
      </div>
    </div>
  );
}

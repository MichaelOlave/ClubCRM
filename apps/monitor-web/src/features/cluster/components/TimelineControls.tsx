"use client";

import { motion } from "framer-motion";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABEL,
  type ClusterEventCategory,
} from "@/features/cluster/lib/eventFilters";

interface TimelineControlsProps {
  isReplay: boolean;
  currentFrame: number;
  paused: boolean;
  queuedFrames: number;
  selectedCategories: readonly ClusterEventCategory[];
  totalFrames: number;
  onRestart?: () => void;
  onToggleCategory: (category: ClusterEventCategory) => void;
  onTogglePaused: () => void;
  onSelectAllCategories: () => void;
  countsByCategory: Record<ClusterEventCategory, number>;
}

export function TimelineControls({
  isReplay,
  currentFrame,
  paused,
  queuedFrames,
  selectedCategories,
  totalFrames,
  onRestart,
  onToggleCategory,
  onTogglePaused,
  onSelectAllCategories,
  countsByCategory,
}: TimelineControlsProps) {
  const progress = totalFrames === 0 ? 0 : Math.min((currentFrame / totalFrames) * 100, 100);
  const showReplayProgress = isReplay && totalFrames > 0;

  return (
    <section
      aria-label="Timeline controls"
      className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <button
            className={`flex h-8 items-center gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-wider transition-all ${
              paused
                ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                : "border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
            }`}
            onClick={onTogglePaused}
            type="button"
          >
            <span
              className={`h-2 w-2 rounded-full ${paused ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
            />
            {paused ? "Resume" : "Pause"}
          </button>

          {onRestart && (
            <button
              className="h-8 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold uppercase tracking-wider text-zinc-100 transition-all hover:bg-white/10"
              onClick={onRestart}
              type="button"
            >
              Restart
            </button>
          )}

          {isReplay && (
            <span className="font-mono text-xs text-zinc-500">
              {currentFrame} / {totalFrames}
            </span>
          )}

          {!isReplay && paused && queuedFrames > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              +{queuedFrames} buffered
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className={`h-7 rounded-full border px-3 text-[10px] font-bold uppercase tracking-tight transition-all ${
              selectedCategories.length === EVENT_CATEGORIES.length
                ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
                : "border-white/5 text-zinc-500 hover:border-white/20"
            }`}
            onClick={onSelectAllCategories}
            type="button"
          >
            All
          </button>
          {EVENT_CATEGORIES.map((category) => {
            const selected = selectedCategories.includes(category);
            const count = countsByCategory[category];
            if (count === 0 && !selected) return null;

            return (
              <button
                key={category}
                aria-pressed={selected}
                className={`h-7 rounded-full border px-3 text-[10px] font-bold uppercase tracking-tight transition-all ${
                  selected
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : "border-white/5 text-zinc-500 hover:border-white/20"
                }`}
                onClick={() => onToggleCategory(category)}
                type="button"
              >
                {EVENT_CATEGORY_LABEL[category].split(" ")[0]}
                <span className="ml-1.5 opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showReplayProgress && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          />
        </div>
      )}
    </section>
  );
}

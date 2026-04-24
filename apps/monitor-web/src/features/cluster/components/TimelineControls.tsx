"use client";

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
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-zinc-400">
            {isReplay ? "Replay controls" : "Live controls"}
          </p>
          <h3 className="text-sm font-semibold text-zinc-100">
            {isReplay ? `${currentFrame} of ${totalFrames} frames` : "Freeze the dashboard without losing frames"}
          </h3>
          <p className="text-sm text-zinc-400">
            {isReplay
              ? "Pause, resume, or restart the recorded session while keeping the event story focused."
              : paused
                ? queuedFrames > 0
                  ? `${queuedFrames} queued frame${queuedFrames === 1 ? "" : "s"} waiting to apply`
                  : "Stream paused. New frames will queue until you resume."
                : "Pause the stream to inspect a failure, then resume and catch up from the buffered backlog."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-100 transition hover:border-white/20 hover:bg-white/5"
            onClick={onTogglePaused}
            type="button"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          {onRestart ? (
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-100 transition hover:border-white/20 hover:bg-white/5"
              onClick={onRestart}
              type="button"
            >
              Restart
            </button>
          ) : null}
        </div>
      </div>

      {showReplayProgress ? (
        <div className="mt-4 h-2 rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-amber-400 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            selectedCategories.length === EVENT_CATEGORIES.length
              ? "border-sky-400/40 bg-sky-500/10 text-sky-100"
              : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5"
          }`}
          onClick={onSelectAllCategories}
          type="button"
        >
          All events
        </button>
        {EVENT_CATEGORIES.map((category) => {
          const selected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                  : "border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/5"
              }`}
              onClick={() => onToggleCategory(category)}
              type="button"
            >
              {EVENT_CATEGORY_LABEL[category]} · {countsByCategory[category]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

"use client";

interface ReplayControlsProps {
  currentFrame: number;
  paused: boolean;
  totalFrames: number;
  onRestart: () => void;
  onTogglePaused: () => void;
}

export function ReplayControls({
  currentFrame,
  paused,
  totalFrames,
  onRestart,
  onTogglePaused,
}: ReplayControlsProps) {
  const progress = totalFrames === 0 ? 0 : Math.min((currentFrame / totalFrames) * 100, 100);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-amber-300">Replay mode</p>
          <h3 className="text-sm font-semibold text-zinc-100">
            {currentFrame} of {totalFrames} frames
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-100 transition hover:border-white/20 hover:bg-white/5"
            onClick={onTogglePaused}
            type="button"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-100 transition hover:border-white/20 hover:bg-white/5"
            onClick={onRestart}
            type="button"
          >
            Restart
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

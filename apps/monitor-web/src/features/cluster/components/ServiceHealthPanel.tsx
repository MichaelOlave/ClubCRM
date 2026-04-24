"use client";

import type { ServiceProbe } from "@/features/cluster/types";

const STATUS_LABEL: Record<ServiceProbe["status"], string> = {
  unknown: "Waiting",
  ok: "Reachable",
  degraded: "Degraded",
  failed: "Failed",
};

const STATUS_BADGE: Record<ServiceProbe["status"], string> = {
  unknown: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-300",
};

export function ServiceHealthPanel({ probes }: { probes: ServiceProbe[] }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-sm">
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          Service proof
        </p>
        <h3 className="text-lg font-semibold text-zinc-100">Traffic continuity</h3>
      </header>

      {probes.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No live application probes configured.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortProbes(probes).map((probe) => (
            <li
              key={probe.service}
              className="group rounded-xl border border-white/5 bg-white/[0.01] p-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-100">{probe.service}</p>
                  <p className="truncate font-mono text-[10px] text-zinc-500">{probe.url}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${STATUS_BADGE[probe.status]}`}
                >
                  {STATUS_LABEL[probe.status]}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/5 pt-2.5 text-[10px] font-medium text-zinc-400">
                <div className="flex justify-between">
                  <span>Latency</span>
                  <span className="text-zinc-200">{formatLatency(probe.last_latency_ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span>HTTP</span>
                  <span className="text-zinc-200">{probe.last_status_code ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Checked</span>
                  <span className="text-zinc-200">{formatTime(probe.last_checked_at)}</span>
                </div>
              </div>
              {probe.last_error ? (
                <div className="mt-2 rounded bg-red-500/5 px-2 py-1 text-[10px] text-red-400/80">
                  {probe.last_error}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sortProbes(probes: ServiceProbe[]): ServiceProbe[] {
  const severity: Record<ServiceProbe["status"], number> = {
    failed: 0,
    degraded: 1,
    unknown: 2,
    ok: 3,
  };
  return [...probes].sort(
    (left, right) =>
      severity[left.status] - severity[right.status] || left.service.localeCompare(right.service)
  );
}

function formatLatency(value: number | null): string {
  if (value === null) {
    return "n/a";
  }
  return `${Math.round(value)} ms`;
}

function formatTime(value: number | null): string {
  if (value === null) {
    return "never";
  }
  return new Date(value * 1000).toLocaleTimeString();
}

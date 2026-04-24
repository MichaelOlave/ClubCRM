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
    <section className="rounded-2xl border border-white/5 bg-black/30 p-4">
      <header>
        <p className="text-xs uppercase tracking-wider text-zinc-400">Service proof</p>
        <h3 className="text-lg font-semibold text-zinc-100">Traffic continuity</h3>
      </header>

      {probes.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          Add `MONITOR_PROBE_TARGETS` to track live application reachability during cluster events.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sortProbes(probes).map((probe) => (
            <li key={probe.service} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-100">{probe.service}</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-zinc-400">{probe.url}</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[probe.status]}`}
                >
                  {STATUS_LABEL[probe.status]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                <p>{formatMetric("Latency", formatLatency(probe.last_latency_ms))}</p>
                <p>{formatMetric("HTTP", probe.last_status_code?.toString() ?? "n/a")}</p>
                <p>{formatMetric("Checked", formatTime(probe.last_checked_at))}</p>
                <p>{formatMetric("Changed", formatTime(probe.last_transition_at))}</p>
              </div>
              {probe.last_error ? (
                <p className="mt-2 text-xs text-zinc-400">{probe.last_error}</p>
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

function formatMetric(label: string, value: string): string {
  return `${label}: ${value}`;
}

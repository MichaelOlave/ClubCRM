"use client";

import type { ClusterReplica, ClusterVolume } from "@/features/cluster/types";

interface StorageHealthPanelProps {
  volumes: ClusterVolume[];
  replicas: ClusterReplica[];
}

export function StorageHealthPanel({ volumes, replicas }: StorageHealthPanelProps) {
  if (volumes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-sm">
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Storage health
          </p>
          <h3 className="text-lg font-semibold text-zinc-100">Longhorn overlay</h3>
        </header>
        <p className="mt-4 text-sm text-zinc-500 italic">No active Longhorn volumes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-sm">
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          Storage health
        </p>
        <h3 className="text-lg font-semibold text-zinc-100">{volumes.length} volumes tracked</h3>
      </header>

      <ul className="flex flex-col gap-3">
        {volumes.map((volume) => {
          const volumeReplicas = replicas.filter((replica) => replica.volume_name === volume.name);
          return (
            <li
              key={volume.name}
              className="group rounded-xl border border-white/5 bg-white/[0.01] p-3 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-zinc-100">
                    {volume.name}
                  </p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {describeVolumeIdentity(volume)}
                  </p>
                </div>
                <span className={healthBadgeClasses(volume.health, volume.robustness)}>
                  {volume.health}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/5 pt-2.5 text-[10px] font-medium text-zinc-400">
                <div className="flex justify-between">
                  <span>Node</span>
                  <span className="text-zinc-200">{volume.attachment_node ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>State</span>
                  <span className="text-zinc-200">{volume.state}</span>
                </div>
                <div className="flex justify-between">
                  <span>Robust</span>
                  <span className="text-zinc-200">{volume.robustness}</span>
                </div>
                <div className="flex justify-between">
                  <span>Replicas</span>
                  <span className="text-zinc-200">{volumeReplicas.length}</span>
                </div>
              </div>

              {volumeReplicas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                  {volumeReplicas.map((replica) => (
                    <span
                      key={replica.name}
                      className="rounded bg-cyan-500/5 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200/70"
                      title={`${replica.node_name}: ${replica.health}`}
                    >
                      {replica.node_name?.slice(-1) ?? "?"}·{replica.health[0]}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function describeVolumeIdentity(volume: ClusterVolume): string {
  const workload = [volume.workload_namespace, volume.workload_name].filter(Boolean).join("/");
  const pvc = [volume.pvc_namespace, volume.pvc_name].filter(Boolean).join("/");

  if (workload && pvc) {
    return `${workload} via ${pvc}`;
  }
  return workload || pvc || "Unmapped workload";
}

function healthBadgeClasses(health: string, robustness: string): string {
  const base = "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider";
  const normalized = `${health} ${robustness}`.toLowerCase();
  if (normalized.includes("fault")) {
    return `${base} bg-red-500/20 text-red-200`;
  }
  if (normalized.includes("degrad")) {
    return `${base} bg-amber-500/20 text-amber-200`;
  }
  return `${base} bg-emerald-500/20 text-emerald-200`;
}

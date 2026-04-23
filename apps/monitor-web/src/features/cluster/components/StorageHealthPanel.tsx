"use client";

import type { ClusterReplica, ClusterVolume } from "@/features/cluster/types";

interface StorageHealthPanelProps {
  volumes: ClusterVolume[];
  replicas: ClusterReplica[];
}

export function StorageHealthPanel({ volumes, replicas }: StorageHealthPanelProps) {
  if (volumes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-400">Storage health</p>
          <h3 className="text-lg font-semibold text-zinc-100">Longhorn overlay</h3>
        </header>
        <p className="mt-3 text-sm text-zinc-400">
          No Longhorn volumes in the current snapshot yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
      <header>
        <p className="text-xs uppercase tracking-wider text-zinc-400">Storage health</p>
        <h3 className="text-lg font-semibold text-zinc-100">{volumes.length} volumes tracked</h3>
      </header>

      <ul className="mt-4 flex flex-col gap-3">
        {volumes.map((volume) => {
          const volumeReplicas = replicas.filter((replica) => replica.volume_name === volume.name);
          return (
            <li key={volume.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm text-zinc-100">{volume.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{describeVolumeIdentity(volume)}</p>
                </div>
                <span className={healthBadgeClasses(volume.health, volume.robustness)}>
                  {volume.health}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                <div>
                  <dt className="text-zinc-500">Attached</dt>
                  <dd>{volume.attachment_node ?? "detached"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">State</dt>
                  <dd>{volume.state}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Robustness</dt>
                  <dd>{volume.robustness}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Replicas</dt>
                  <dd>{volumeReplicas.length}</dd>
                </div>
              </dl>

              {volumeReplicas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {volumeReplicas.map((replica) => (
                    <span
                      key={replica.name}
                      className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 font-mono text-[11px] text-cyan-100"
                    >
                      {replica.node_name ?? "unknown"} · {replica.health}
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

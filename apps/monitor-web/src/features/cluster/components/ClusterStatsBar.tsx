"use client";

import { motion } from "framer-motion";
import type { ClusterStateShape } from "@/features/cluster/reducers/applyEvent";

interface ClusterStatsBarProps {
  state: ClusterStateShape;
}

export function ClusterStatsBar({ state }: ClusterStatsBarProps) {
  const readyNodes = state.nodes.filter((n) => n.status === "Ready").length;
  const runningPods = state.pods.filter((p) => p.status === "Running").length;
  const healthyProbes = state.probes.filter((p) => p.status === "ok").length;
  const healthyVolumes = state.volumes.filter((v) => v.health === "healthy").length;

  const stats = [
    {
      label: "Nodes",
      value: state.nodes.length,
      subValue: `Ready: ${readyNodes}`,
      color: "emerald",
    },
    {
      label: "Pods",
      value: state.pods.length,
      subValue: `Running: ${runningPods}`,
      color: "blue",
    },
    {
      label: "Services",
      value: state.probes.length,
      subValue: `Online: ${healthyProbes}`,
      color: "amber",
    },
    {
      label: "Storage",
      value: state.volumes.length,
      subValue: `Healthy: ${healthyVolumes}`,
      color: "cyan",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-4 backdrop-blur-md"
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
              {stat.label}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <motion.span
                key={`${stat.label}-${stat.value}`}
                initial={{ opacity: 0.4, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="text-2xl font-bold tracking-tight text-zinc-100"
              >
                {stat.value}
              </motion.span>
              <motion.span
                key={`${stat.label}-sub-${stat.subValue}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={`text-xs font-medium text-${stat.color}-400/80`}
              >
                {stat.subValue}
              </motion.span>
            </div>
          </div>
          <div
            className={`absolute right-[-10%] top-[-20%] h-16 w-16 rounded-full bg-${stat.color}-500/10 blur-2xl`}
          />
        </motion.div>
      ))}
    </div>
  );
}

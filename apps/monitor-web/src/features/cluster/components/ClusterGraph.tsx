"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ClusterNode,
  ClusterPod,
  ClusterVolume,
  PodMovedEvent,
} from "@/features/cluster/types";
import type { ClusterStateShape } from "@/features/cluster/reducers/applyEvent";

const NODE_WIDTH = 280;
const NODE_GAP = 40;
const NODE_PADDING_TOP = 72;
const POD_ROW_HEIGHT = 36;
const POD_MIN_HEIGHT = 120;

interface NodeData {
  node: ClusterNode;
  pods: Array<ClusterPod & { volumeNames: string[] }>;
  volumeCount: number;
}

function NodeBox({ data }: NodeProps<NodeData>) {
  const { node, pods, volumeCount } = data;
  const isReady = node.status === "Ready";
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-zinc-900/70 backdrop-blur-sm transition-colors ${
        isReady
          ? "border-emerald-500/60 shadow-[0_0_30px_-10px_rgba(16,185,129,0.45)]"
          : "border-red-500/70 shadow-[0_0_30px_-10px_rgba(239,68,68,0.45)]"
      }`}
      style={{ width: NODE_WIDTH }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!h-2 !w-2 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!h-2 !w-2 !border-0 !bg-transparent"
      />
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-400">Node</p>
          <h3 className="text-lg font-semibold text-zinc-100">{node.name}</h3>
          {node.roles.length > 0 && (
            <p className="text-[11px] text-zinc-500">{node.roles.join(", ")}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              isReady ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
            }`}
          >
            {node.status}
          </span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100">
            {volumeCount} vols
          </span>
        </div>
      </header>
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <AnimatePresence initial={false}>
          {pods.map((pod) => (
            <motion.div
              key={podKey(pod)}
              layout
              layoutId={`pod-${podKey(pod)}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className={podClasses(pod)}
              title={`${pod.namespace}/${pod.name} (${pod.status})`}
            >
              <span className="truncate font-mono text-[11px]">{pod.name}</span>
              {pod.volumeNames.length > 0 && (
                <span className="rounded-full border border-cyan-400/25 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cyan-100">
                  {pod.volumeNames.length} vol
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {pods.length === 0 && <p className="text-xs text-zinc-500">No pods scheduled.</p>}
      </div>
    </div>
  );
}

const nodeTypes = { clusterNode: NodeBox };

interface ClusterGraphProps {
  state: ClusterStateShape;
  recentMoves?: PodMovedEvent[];
}

export function ClusterGraph({ state, recentMoves = [] }: ClusterGraphProps) {
  const { flowNodes, edges, boundaryMoves } = useMemo(
    () => buildFlow(state, recentMoves),
    [state, recentMoves]
  );

  const unscheduled = state.pods.filter((p) => !p.node_name);

  return (
    <div className="flex h-[400px] w-full flex-col rounded-2xl border border-white/5 bg-black/30 sm:h-[500px] lg:h-[620px]">
      <div className="flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
        >
          <Background gap={24} color="#1f1f23" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {unscheduled.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3 text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-wider text-zinc-500">
            Unscheduled pods:
          </span>{" "}
          {unscheduled.map((p) => `${p.namespace}/${p.name}`).join(", ")}
        </div>
      )}
      {boundaryMoves.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">
              Recent reassignments:
            </span>
            {boundaryMoves.map((move) => (
              <span
                key={`boundary-${move.ts}-${move.namespace}-${move.name}`}
                className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 font-mono text-[11px] text-violet-100"
              >
                {move.name}: {move.from_node ?? "(unscheduled)"} → {move.to_node ?? "(unscheduled)"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildFlow(
  state: ClusterStateShape,
  recentMoves: PodMovedEvent[]
): { flowNodes: Node[]; edges: Edge[]; boundaryMoves: PodMovedEvent[] } {
  const sortedNodes = [...state.nodes].sort((a, b) => a.name.localeCompare(b.name));
  const nodeNames = new Set(sortedNodes.map((node) => node.name));
  const flowNodes: Node[] = sortedNodes.map((node, index) => {
    const pods = state.pods
      .filter((pod) => pod.node_name === node.name)
      .map((pod) => ({
        ...pod,
        volumeNames: volumeNamesForPod(pod, state.volumes),
      }));
    const volumeCount = state.volumes.filter(
      (volume) => volume.attachment_node === node.name
    ).length;
    const height = Math.max(POD_MIN_HEIGHT, NODE_PADDING_TOP + pods.length * POD_ROW_HEIGHT);
    return {
      id: `node-${node.name}`,
      type: "clusterNode",
      position: { x: index * (NODE_WIDTH + NODE_GAP), y: 0 },
      data: { node, pods, volumeCount },
      style: { width: NODE_WIDTH, height },
      draggable: false,
    };
  });

  const uniqueMoves = dedupeRecentMoves(recentMoves);
  const edges = uniqueMoves
    .filter(
      (move) =>
        move.from_node &&
        move.to_node &&
        move.from_node !== move.to_node &&
        nodeNames.has(move.from_node) &&
        nodeNames.has(move.to_node)
    )
    .map((move) => ({
      id: `move-${move.ts}-${move.namespace}-${move.name}`,
      source: `node-${move.from_node}`,
      target: `node-${move.to_node}`,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#c084fc" },
      style: {
        stroke: "#c084fc",
        strokeWidth: 2,
        strokeDasharray: "8 6",
      },
      label: `Move ${move.name}`,
      labelStyle: {
        fill: "#f5f3ff",
        fontSize: 11,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: "rgba(88, 28, 135, 0.92)",
        stroke: "rgba(196, 181, 253, 0.35)",
        strokeWidth: 1,
        borderRadius: 999,
      },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 999,
    }));
  const boundaryMoves = uniqueMoves.filter(
    (move) =>
      !move.from_node ||
      !move.to_node ||
      move.from_node === move.to_node ||
      !nodeNames.has(move.from_node) ||
      !nodeNames.has(move.to_node)
  );

  return { flowNodes, edges, boundaryMoves };
}

function podKey(pod: ClusterPod): string {
  return pod.uid ?? `${pod.namespace}/${pod.name}`;
}

function podClasses(pod: ClusterPod & { volumeNames?: string[] }): string {
  const base = "flex max-w-[140px] items-center gap-2 rounded-full border px-3 py-1 text-xs";
  switch (pod.status) {
    case "Running":
      return `${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-100`;
    case "Pending":
      return `${base} border-yellow-500/40 bg-yellow-500/10 text-yellow-100`;
    case "Failed":
      return `${base} border-red-500/40 bg-red-500/10 text-red-100`;
    case "Succeeded":
      return `${base} border-sky-500/40 bg-sky-500/10 text-sky-100`;
    default:
      return `${base} border-zinc-500/40 bg-zinc-500/10 text-zinc-200`;
  }
}

function volumeNamesForPod(pod: ClusterPod, volumes: ClusterVolume[]): string[] {
  return volumes
    .filter(
      (volume) => volume.workload_name === pod.name && volume.workload_namespace === pod.namespace
    )
    .map((volume) => volume.name);
}

function dedupeRecentMoves(recentMoves: PodMovedEvent[]): PodMovedEvent[] {
  const seen = new Set<string>();
  const deduped: PodMovedEvent[] = [];

  for (const move of recentMoves) {
    const key = `${move.namespace}/${move.name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(move);
    if (deduped.length === 6) {
      break;
    }
  }

  return deduped;
}

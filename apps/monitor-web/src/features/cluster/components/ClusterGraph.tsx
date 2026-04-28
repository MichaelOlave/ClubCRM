"use client";

import { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  useReactFlow,
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
      className={`flex flex-col overflow-hidden rounded-2xl border bg-zinc-900/80 backdrop-blur-md transition-all duration-500 ${
        isReady
          ? "border-emerald-500/30 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.2)]"
          : "border-red-500/40 shadow-[0_8px_32px_-8px_rgba(239,68,68,0.3)]"
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
      <header className="relative flex items-center justify-between px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Host node
          </p>
          <h3 className="truncate text-lg font-bold tracking-tight text-zinc-100">{node.name}</h3>
          <div className="mt-1 flex gap-1.5">
            {node.roles.map((role) => (
              <span
                key={role}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase text-zinc-400"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400 animate-pulse"}`}
            />
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${isReady ? "text-emerald-400" : "text-red-400"}`}
            >
              {node.status}
            </span>
          </div>
          <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/20">
            {volumeCount} volumes
          </span>
        </div>

        {/* Subtle background glow */}
        <div
          className={`absolute -right-4 -top-4 h-16 w-16 rounded-full blur-3xl opacity-20 ${isReady ? "bg-emerald-500" : "bg-red-500"}`}
        />
      </header>

      <div className="flex flex-col gap-2 bg-black/20 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Scheduled Pods
          </span>
          <span className="text-[10px] font-mono text-zinc-600">{pods.length} total</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {pods.map((pod) => (
              <motion.div
                key={podKey(pod)}
                layout
                layoutId={`pod-${podKey(pod)}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={podClasses(pod)}
                title={`${pod.namespace}/${pod.name} (${pod.status})`}
              >
                <span className="truncate font-mono text-[10px] font-medium">{pod.name}</span>
                {pod.volumeNames.length > 0 && (
                  <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300">
                    {pod.volumeNames.length}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {pods.length === 0 && (
            <div className="flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-white/5 text-[10px] text-zinc-600">
              Empty node
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoFitView({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView, nodeCount]);
  return null;
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
    <div className="flex h-[500px] w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 backdrop-blur-xl lg:h-[750px]">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
        >
          <AutoFitView nodeCount={flowNodes.length} />
          <Background gap={32} size={1} color="rgba(255,255,255,0.03)" />
          <Controls
            showInteractive={false}
            className="!bg-zinc-900 !border-white/10 !fill-zinc-400"
          />
        </ReactFlow>

        {/* Overlay for Unscheduled Pods */}
        {unscheduled.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">
              Pending Scheduling:
            </span>
            {unscheduled.map((p) => (
              <span
                key={p.uid ?? `${p.namespace}/${p.name}`}
                className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-200/70 border border-amber-500/20"
              >
                {p.namespace}/{p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {boundaryMoves.length > 0 && (
        <div className="border-t border-white/5 bg-black/40 px-5 py-3.5">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Recent Transitions:
            </span>
            {boundaryMoves.map((move) => (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={`boundary-${move.ts}-${move.namespace}-${move.name}`}
                className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 font-mono text-[10px] text-violet-200"
              >
                {move.name}: {move.from_node ?? "?"} → {move.to_node ?? "?"}
              </motion.span>
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

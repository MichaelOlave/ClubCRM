import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClusterGraph } from "@/features/cluster/components/ClusterGraph";
import type { ClusterStateShape } from "@/features/cluster/reducers/applyEvent";
import type { PodMovedEvent } from "@/features/cluster/types";

vi.mock("reactflow", async () => {
  const React = await import("react");

  return {
    default: ({
      children,
      edges,
      nodeTypes,
      nodes,
    }: {
      children?: React.ReactNode;
      edges: Array<{ id: string; label?: string }>;
      nodeTypes: Record<string, React.ComponentType<unknown>>;
      nodes: Array<{ id: string; type: string; data: unknown }>;
    }) =>
      React.createElement("div", { "data-testid": "react-flow" }, [
        ...nodes.map((node) => {
          const NodeComponent = nodeTypes[node.type];
          return React.createElement(NodeComponent, {
            key: node.id,
            id: node.id,
            data: node.data,
            dragging: false,
            isConnectable: false,
            selected: false,
            type: node.type,
            xPos: 0,
            yPos: 0,
            zIndex: 0,
          });
        }),
        ...edges.map((edge) =>
          React.createElement("div", { key: edge.id, "data-testid": "move-edge" }, edge.label)
        ),
        children,
      ]),
    Background: () => <span data-testid="flow-background" />,
    Controls: () => <span data-testid="flow-controls" />,
    Handle: () => <span data-testid="flow-handle" />,
    MarkerType: { ArrowClosed: "arrowclosed" },
    Position: { Left: "left", Right: "right" },
  };
});

describe("ClusterGraph", () => {
  it("renders node cards, unscheduled pods, and recent movement cues", () => {
    const state: ClusterStateShape = {
      ts: 2000,
      nodes: [
        { name: "server1", status: "Ready", roles: ["control-plane"] },
        { name: "server2", status: "Ready", roles: [] },
      ],
      pods: [
        {
          namespace: "clubcrm",
          name: "api-1",
          status: "Running",
          node_name: "server2",
        },
        {
          namespace: "clubcrm",
          name: "job-1",
          status: "Pending",
          node_name: null,
        },
      ],
      volumes: [
        {
          name: "pvc-api-cache",
          pvc_namespace: "clubcrm",
          pvc_name: "api-cache",
          workload_namespace: "clubcrm",
          workload_name: "api-1",
          workload_kind: "Deployment",
          attachment_node: "server2",
          state: "attached",
          robustness: "healthy",
          health: "healthy",
        },
      ],
      replicas: [],
    };

    const recentMoves: PodMovedEvent[] = [
      {
        kind: "POD_MOVED",
        ts: 2000,
        namespace: "clubcrm",
        name: "api-1",
        from_node: "server1",
        to_node: "server2",
      },
      {
        kind: "POD_MOVED",
        ts: 1995,
        namespace: "clubcrm",
        name: "job-1",
        from_node: null,
        to_node: "server2",
      },
    ];

    render(<ClusterGraph state={state} recentMoves={recentMoves} />);

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    expect(screen.getByText("server1")).toBeInTheDocument();
    expect(screen.getByText("server2")).toBeInTheDocument();
    expect(screen.getByText("api-1")).toBeInTheDocument();
    expect(screen.getByText("1 vol")).toBeInTheDocument();
    expect(screen.getByText("Move api-1")).toBeInTheDocument();
    expect(screen.getByText("Unscheduled pods:")).toBeInTheDocument();
    expect(screen.getByText("clubcrm/job-1")).toBeInTheDocument();
    expect(screen.getByText("Recent reassignments:")).toBeInTheDocument();
    expect(screen.getByText("job-1: (unscheduled) → server2")).toBeInTheDocument();
    expect(screen.getByText("1 vols")).toBeInTheDocument();
  });
});

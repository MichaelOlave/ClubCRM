import { describe, expect, it } from "vitest";
import {
  applyEvent,
  snapshotToState,
  type ClusterStateShape,
} from "@/features/cluster/reducers/applyEvent";
import type { ClusterSnapshot } from "@/features/cluster/types";

function baseState(): ClusterStateShape {
  const snapshot: ClusterSnapshot = {
    type: "snapshot",
    ts: 1000,
    nodes: [
      { name: "server1", status: "Ready", roles: ["control-plane"] },
      { name: "server2", status: "Ready", roles: [] },
    ],
    pods: [{ namespace: "clubcrm", name: "api-1", status: "Running", node_name: "server1" }],
    volumes: [
      {
        name: "pvc-postgres",
        pvc_namespace: "clubcrm-data",
        pvc_name: "postgres-data",
        workload_namespace: "clubcrm-data",
        workload_name: "postgres-0",
        workload_kind: "StatefulSet",
        attachment_node: "server2",
        state: "attached",
        robustness: "healthy",
        health: "healthy",
      },
    ],
    replicas: [
      {
        name: "pvc-postgres-r-1",
        volume_name: "pvc-postgres",
        node_name: "server2",
        mode: "RW",
        health: "healthy",
      },
    ],
  };
  return snapshotToState(snapshot);
}

describe("applyEvent", () => {
  it("marks a node NotReady on NODE_DOWN", () => {
    const next = applyEvent(baseState(), {
      kind: "NODE_DOWN",
      ts: 1100,
      node: "server2",
    });
    const server2 = next.nodes.find((n) => n.name === "server2");
    expect(server2?.status).toBe("NotReady");
    expect(next.ts).toBe(1100);
  });

  it("adds a new node on NODE_READY if missing", () => {
    const next = applyEvent(baseState(), {
      kind: "NODE_READY",
      ts: 1200,
      node: "server3",
    });
    expect(next.nodes.some((n) => n.name === "server3" && n.status === "Ready")).toBe(true);
  });

  it("inserts a new pod on POD_CREATED", () => {
    const next = applyEvent(baseState(), {
      kind: "POD_CREATED",
      ts: 1300,
      namespace: "clubcrm",
      name: "api-2",
      node_name: "server2",
      status: "Pending",
    });
    expect(next.pods).toHaveLength(2);
    const pod = next.pods.find((p) => p.name === "api-2");
    expect(pod?.node_name).toBe("server2");
    expect(pod?.status).toBe("Pending");
  });

  it("updates node_name on POD_MOVED", () => {
    const next = applyEvent(baseState(), {
      kind: "POD_MOVED",
      ts: 1400,
      namespace: "clubcrm",
      name: "api-1",
      from_node: "server1",
      to_node: "server2",
    });
    const moved = next.pods.find((p) => p.name === "api-1");
    expect(moved?.node_name).toBe("server2");
  });

  it("updates pod status on POD_STATUS", () => {
    const next = applyEvent(baseState(), {
      kind: "POD_STATUS",
      ts: 1500,
      namespace: "clubcrm",
      name: "api-1",
      node_name: "server1",
      from_status: "Running",
      to_status: "Failed",
    });
    const pod = next.pods.find((p) => p.name === "api-1");
    expect(pod?.status).toBe("Failed");
  });

  it("removes the pod on POD_DELETED", () => {
    const next = applyEvent(baseState(), {
      kind: "POD_DELETED",
      ts: 1600,
      namespace: "clubcrm",
      name: "api-1",
      node_name: "server1",
    });
    expect(next.pods).toHaveLength(0);
  });

  it("keeps state intact on POD_CRASHED (informational)", () => {
    const state = baseState();
    const next = applyEvent(state, {
      kind: "POD_CRASHED",
      ts: 1700,
      namespace: "clubcrm",
      name: "api-1",
      node_name: "server1",
      reason: "OOMKilled",
    });
    expect(next.pods).toEqual(state.pods);
    expect(next.ts).toBe(1700);
  });

  it("updates attachment state on VOLUME_REATTACHED", () => {
    const next = applyEvent(baseState(), {
      kind: "VOLUME_REATTACHED",
      ts: 1800,
      volume: "pvc-postgres",
      from_node: "server2",
      to_node: "server3",
      pvc_namespace: "clubcrm-data",
      pvc_name: "postgres-data",
      workload_namespace: "clubcrm-data",
      workload_name: "postgres-0",
    });
    expect(next.volumes.find((volume) => volume.name === "pvc-postgres")?.attachment_node).toBe(
      "server3"
    );
  });

  it("records replica health changes", () => {
    const next = applyEvent(baseState(), {
      kind: "REPLICA_HEALTH_CHANGED",
      ts: 1900,
      volume: "pvc-postgres",
      replica: "pvc-postgres-r-2",
      node_name: "server3",
      from_health: "healthy",
      to_health: "degraded",
    });
    expect(next.replicas.find((replica) => replica.name === "pvc-postgres-r-2")?.health).toBe(
      "degraded"
    );
  });
});

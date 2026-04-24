import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClusterStream } from "@/features/cluster/hooks/useClusterStream";
import type { ClusterReplay, ClusterSnapshot, WsFrame } from "@/features/cluster/types";

const INITIAL_SNAPSHOT: ClusterSnapshot = {
  type: "snapshot",
  ts: 1000,
  nodes: [{ name: "server1", status: "Ready", roles: ["control-plane"] }],
  pods: [
    {
      namespace: "clubcrm",
      name: "api-1",
      status: "Running",
      node_name: "server1",
    },
  ],
  volumes: [],
  replicas: [],
  probes: [],
};

const REPLAY_SESSION: ClusterReplay = {
  type: "replay",
  source: "/tmp/cluster-session.jsonl",
  initial_snapshot: INITIAL_SNAPSHOT,
  frames: [
    {
      type: "event",
      ts: 1001,
      event: {
        kind: "NODE_READY",
        ts: 1001,
        node: "server2",
      },
    },
    {
      type: "event",
      ts: 1002,
      event: {
        kind: "POD_MOVED",
        ts: 1002,
        namespace: "clubcrm",
        name: "api-1",
        from_node: "server1",
        to_node: "server2",
      },
    },
  ],
  started_at: 1000,
  ended_at: 1002,
};

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  emitOpen() {
    this.onopen?.();
  }

  emitFrame(frame: WsFrame) {
    this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent<string>);
  }

  emitRaw(data: string) {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  emitError() {
    this.onerror?.();
  }

  emitClose() {
    this.onclose?.();
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

describe("useClusterStream", () => {
  beforeEach(() => {
    MockWebSocket.reset();
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("stays offline when no stream URL is provided", () => {
    const { result } = renderHook(() => useClusterStream(INITIAL_SNAPSHOT, ""));

    expect(result.current.streamStatus).toBe("offline");
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current.cluster.nodes).toHaveLength(1);
  });

  it("applies snapshot and event frames while tolerating malformed messages", async () => {
    const { result } = renderHook(() =>
      useClusterStream(INITIAL_SNAPSHOT, "ws://localhost:8001/ws/cluster")
    );

    expect(result.current.streamStatus).toBe("connecting");
    const socket = MockWebSocket.instances[0];
    expect(socket?.url).toContain("ws://localhost:8001/ws/cluster");

    act(() => {
      socket.emitOpen();
    });

    await waitFor(() => {
      expect(result.current.streamStatus).toBe("live");
    });

    act(() => {
      socket.emitFrame({
        type: "snapshot",
        ts: 1100,
        nodes: [
          { name: "server1", status: "Ready", roles: ["control-plane"] },
          { name: "server2", status: "Ready", roles: [] },
        ],
        pods: [
          {
            namespace: "clubcrm",
            name: "api-1",
            status: "Running",
            node_name: "server1",
          },
          {
            namespace: "clubcrm",
            name: "web-1",
            status: "Pending",
            node_name: "server2",
          },
        ],
        volumes: [],
        replicas: [],
        probes: [],
      });
      socket.emitFrame({
        type: "event",
        ts: 1200,
        event: {
          kind: "POD_MOVED",
          ts: 1200,
          namespace: "clubcrm",
          name: "api-1",
          from_node: "server1",
          to_node: "server2",
        },
      });
      socket.emitFrame({
        type: "event",
        ts: 1250,
        event: {
          kind: "PROBE_FAILED",
          ts: 1250,
          service: "clubcrm-web",
          url: "https://clubcrm.local/login",
          error: "timed out",
        },
      });
      socket.emitRaw("{not-json");
    });

    await waitFor(() => {
      expect(result.current.cluster.nodes).toHaveLength(2);
      expect(result.current.cluster.pods.find((pod) => pod.name === "api-1")?.node_name).toBe(
        "server2"
      );
      expect(result.current.cluster.probes[0]?.status).toBe("failed");
      expect(result.current.eventLog[0]?.kind).toBe("PROBE_FAILED");
    });
  });

  it("reconnects after close and cleans up the active socket on unmount", async () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() =>
      useClusterStream(INITIAL_SNAPSHOT, "ws://localhost:8001/ws/cluster")
    );

    const firstSocket = MockWebSocket.instances[0];

    act(() => {
      firstSocket.emitOpen();
    });

    expect(result.current.streamStatus).toBe("live");

    act(() => {
      firstSocket.emitClose();
    });

    expect(result.current.streamStatus).toBe("reconnecting");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
    const secondSocket = MockWebSocket.instances[1];

    act(() => {
      secondSocket.emitOpen();
    });

    expect(result.current.streamStatus).toBe("live");

    unmount();

    expect(secondSocket.close).toHaveBeenCalledTimes(1);
  });

  it("replays recorded frames without opening a websocket", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useClusterStream(INITIAL_SNAPSHOT, "", REPLAY_SESSION));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current.streamStatus).toBe("replay");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.eventLog[0]?.kind).toBe("NODE_READY");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.cluster.pods.find((pod) => pod.name === "api-1")?.node_name).toBe(
      "server2"
    );
    expect(result.current.replay.currentFrame).toBe(2);
    expect(result.current.replay.paused).toBe(true);
  });
});

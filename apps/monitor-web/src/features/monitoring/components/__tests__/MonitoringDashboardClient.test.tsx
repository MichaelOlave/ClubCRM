import { act, fireEvent, render, screen } from "@testing-library/react";
import { MonitoringDashboardClient } from "@/features/monitoring/components/MonitoringDashboardClient";
import { createEmptySnapshot } from "@/features/monitoring/lib/snapshot";
import type { MonitoringSnapshot } from "@/features/monitoring/types";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.();
  }

  emitOpen() {
    this.onopen?.();
  }

  emitMessage(payload: MonitoringSnapshot) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe("MonitoringDashboardClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}")))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("updates the dashboard from websocket frames and reconnects after close", async () => {
    const initialSnapshot = createEmptySnapshot();

    render(
      <MonitoringDashboardClient
        demoUrl="http://clubcrm.local/system/health"
        initialSnapshot={initialSnapshot}
        streamUrl="ws://localhost:8010/ws/stream"
      />
    );

    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => {
      FakeWebSocket.instances[0]?.emitOpen();
      FakeWebSocket.instances[0]?.emitMessage({
        ...initialSnapshot,
        service: {
          ...initialSnapshot.service,
          status: "up",
          uptime_percentage: 99.5,
          latest: {
            checked_at: new Date().toISOString(),
            available: true,
            latency_ms: 145,
            status_code: 200,
            error: null,
          },
        },
        generated_at: new Date().toISOString(),
      });
    });

    expect(screen.getByText("145 ms")).toBeInTheDocument();
    await act(async () => {
      FakeWebSocket.instances[0]?.close();
      vi.advanceTimersByTime(1000);
    });

    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2);
  });

  it("switches between the tabbed monitoring views", () => {
    const initialSnapshot = {
      ...createEmptySnapshot(),
      containers: {
        vm1: [{ name: "nginx", status: "running", image: "nginx:latest" }],
      },
      kubernetes: {
        ...createEmptySnapshot().kubernetes,
        connected: true,
        source: "cluster-api",
        pods: [
          { namespace: "default", name: "clubcrm-web-1", status: "Running", node_name: "vm1" },
        ],
      },
    } satisfies MonitoringSnapshot;

    render(
      <MonitoringDashboardClient
        demoUrl="http://clubcrm.local/system/health"
        initialSnapshot={initialSnapshot}
        streamUrl="ws://localhost:8010/ws/stream"
      />
    );

    expect(screen.getByRole("tab", { name: /Overview/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Current view")).not.toBeInTheDocument();
    expect(screen.getByText("Latency over time")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Infrastructure/i }));

    expect(screen.getByText("Container status grid")).toBeInTheDocument();
    expect(screen.getByText("Nodes and pods")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Controls/i }));

    expect(screen.getByTitle("ClubCRM live routing demo")).toBeInTheDocument();
  });

  it("opens an in-app confirmation modal before running VM power actions", async () => {
    const initialSnapshot = {
      ...createEmptySnapshot(),
      vms: [
        {
          id: "Server1",
          power_state: "stopped",
          agent_status: "offline",
          cpu_percent: 0,
          memory_percent: 0,
          last_seen_at: null,
          last_monotonic_time: null,
          containers: [],
          pending_commands: 0,
        },
      ],
    } satisfies MonitoringSnapshot;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            vm_id: "Server1",
            action: "start",
            power_state: "running",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...initialSnapshot,
            vms: [
              {
                ...initialSnapshot.vms[0],
                power_state: "running",
                agent_status: "online",
              },
            ],
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MonitoringDashboardClient
        demoUrl="http://clubcrm.local/system/health"
        initialSnapshot={initialSnapshot}
        streamUrl="ws://localhost:8010/ws/stream"
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "start Server1" })[0]!);

    expect(screen.getByText("Run this demo command?")).toBeInTheDocument();
    expect(screen.getByText("Confirm start for Server1?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/control/vms/Server1/power",
      expect.objectContaining({
        method: "POST",
      })
    );
  });
});

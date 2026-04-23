import { act, render, screen } from "@testing-library/react";
import { LiveClubcrmFrame } from "@/features/monitoring/components/LiveClubcrmFrame";

const initialSnapshot = {
  checkedAt: "2026-04-18T15:30:00.000Z",
  webRuntime: {
    service: "clubcrm-web",
    instanceId: "clubcrm-web-abc123",
    podName: "clubcrm-web-abc123",
    namespace: "clubcrm",
    nodeName: "server2",
    platform: "kubernetes" as const,
  },
  api: {
    connected: true,
    status: "ok",
    endpoint: "http://clubcrm.local/system/health/live-routing",
    runtime: {
      service: "clubcrm-api",
      instanceId: "clubcrm-api-def456",
      podName: "clubcrm-api-def456",
      namespace: "clubcrm",
      nodeName: "server3",
      platform: "kubernetes" as const,
    },
  },
};

describe("LiveClubcrmFrame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the last good routing snapshot visible while reconnecting", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(initialSnapshot), { status: 200 }))
      .mockRejectedValueOnce(new Error("Network request failed during failover."))
      .mockImplementation(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    render(<LiveClubcrmFrame demoUrl="http://clubcrm.local/demo/failover" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getAllByText("server2").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unable to load the failover view")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(screen.getAllByText("server2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Disruption observed").length).toBeGreaterThan(0);
    expect(screen.getByText("Network request failed during failover.")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load the failover view")).not.toBeInTheDocument();
  });

  it("locks onto the first healthy replacement during a guided failover run", async () => {
    const replacementSnapshot = {
      ...initialSnapshot,
      checkedAt: "2026-04-18T15:30:02.000Z",
      webRuntime: {
        ...initialSnapshot.webRuntime,
        instanceId: "clubcrm-web-def789",
        podName: "clubcrm-web-def789",
        nodeName: "server3",
      },
    };
    const noisyTargetSnapshot = {
      ...initialSnapshot,
      checkedAt: "2026-04-18T15:30:04.000Z",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(initialSnapshot), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(replacementSnapshot), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(noisyTargetSnapshot), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(<LiveClubcrmFrame demoUrl="http://clubcrm.local/demo/failover" />);

    await act(async () => {
      await Promise.resolve();
    });

    rerender(
      <LiveClubcrmFrame
        activeFailoverRun={{ runToken: 1, targetVmId: "Server2" }}
        demoUrl="http://clubcrm.local/demo/failover"
        serverStates={[
          { id: "Server2", powerState: "stopped", agentStatus: "offline" },
          { id: "Server3", powerState: "running", agentStatus: "online" },
        ]}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(screen.getAllByText("server3").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Traffic moved from server2 \(clubcrm-web-abc123\) to server3 \(clubcrm-web-def789\)\./i
      )
    ).toBeInTheDocument();
  });
});

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
      .mockRejectedValueOnce(new Error("Network request failed during failover."));
    vi.stubGlobal("fetch", fetchMock);

    render(<LiveClubcrmFrame demoUrl="http://clubcrm.local/demo/failover" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getAllByText("clubcrm-web-abc123").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unable to load the failover view")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(screen.getAllByText("clubcrm-web-abc123").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for routing to recover")).toBeInTheDocument();
    expect(screen.getByText("Network request failed during failover.")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load the failover view")).not.toBeInTheDocument();
  });
});

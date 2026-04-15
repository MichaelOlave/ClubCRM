import { resolveMonitoringStreamUrl } from "@/features/monitoring/hooks/useMonitoringStream";

describe("resolveMonitoringStreamUrl", () => {
  it("rewrites loopback websocket hosts to the current page hostname", () => {
    expect(
      resolveMonitoringStreamUrl("ws://localhost:8010/ws/stream", "http://192.168.139.1:3101/")
    ).toBe("ws://192.168.139.1:8010/ws/stream");
  });

  it("preserves the configured host when it is already remote", () => {
    expect(
      resolveMonitoringStreamUrl(
        "ws://monitor-host.local:8010/ws/stream",
        "http://192.168.139.1:3101/"
      )
    ).toBe("ws://monitor-host.local:8010/ws/stream");
  });
});

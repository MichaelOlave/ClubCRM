import { fireEvent, render, screen } from "@testing-library/react";
import { LatencyChart } from "@/features/monitoring/components/LatencyChart";

describe("LatencyChart", () => {
  it("shows a legend and reveals tooltip details when a point is hovered", () => {
    render(
      <LatencyChart
        history={[
          {
            checked_at: "2026-04-07T12:00:00.000Z",
            available: true,
            latency_ms: 200,
            status_code: 200,
            error: null,
          },
          {
            checked_at: "2026-04-07T12:01:00.000Z",
            available: true,
            latency_ms: 137,
            status_code: 200,
            error: null,
          },
          {
            checked_at: "2026-04-07T12:02:00.000Z",
            available: false,
            latency_ms: null,
            status_code: 503,
            error: "Service unavailable",
          },
        ]}
        targetUrl="https://monitor.clubcrm.local/health"
      />,
    );

    expect(screen.getByText("Latency trend")).toBeInTheDocument();
    expect(screen.getByText("Healthy check")).toBeInTheDocument();
    expect(screen.getByText("Failed check")).toBeInTheDocument();
    expect(screen.getByText("monitor.clubcrm.local/health")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByLabelText("Latency sample 2"));

    expect(screen.getByText("Hovered sample")).toBeInTheDocument();
    expect(screen.getByText("137 ms")).toBeInTheDocument();
    expect(screen.getByText("HTTP 200")).toBeInTheDocument();
  });

  it("plots a readable subset when the history is very dense", () => {
    render(
      <LatencyChart
        history={Array.from({ length: 80 }, (_, index) => ({
          checked_at: new Date(Date.UTC(2026, 3, 7, 12, index, 0)).toISOString(),
          available: true,
          latency_ms: 100 + index,
          status_code: 200,
          error: null,
        }))}
        targetUrl="https://monitor.clubcrm.local/health"
      />,
    );

    expect(screen.getByText("48 shown on chart")).toBeInTheDocument();
    expect(screen.getByText("80 checks in history")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Latency sample /)).toHaveLength(48);
  });
});

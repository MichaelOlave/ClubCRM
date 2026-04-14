import { render, screen } from "@testing-library/react";
import { VmPanel } from "@/features/monitoring/components/VmPanel";

describe("VmPanel", () => {
  it("shows power state separately from agent status", () => {
    render(
      <VmPanel
        pendingActions={{}}
        vms={[
          {
            id: "DemoControlPlaneServer",
            power_state: "running",
            agent_status: "offline",
            cpu_percent: 0,
            memory_percent: 0,
            last_seen_at: null,
            last_monotonic_time: null,
            containers: [],
            pending_commands: 0,
          },
        ]}
        onVmPowerAction={vi.fn()}
      />,
    );

    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("agent offline")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { ControlRail } from "@/features/monitoring/components/ControlRail";

describe("ControlRail", () => {
  it("triggers the provided action handlers", () => {
    const onVmPowerAction = vi.fn();
    const onContainerAction = vi.fn();
    const onPodRecycle = vi.fn();

    render(
      <ControlRail
        containers={{ vm1: [{ name: "nginx", status: "running" }] }}
        pendingActions={{}}
        pods={[{ namespace: "default", name: "clubcrm-web-1", status: "Running" }]}
        vms={[{ id: "vm1" }]}
        onContainerAction={onContainerAction}
        onPodRecycle={onPodRecycle}
        onVmPowerAction={onVmPowerAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "stop vm1" }));
    fireEvent.click(screen.getByRole("button", { name: "restart nginx on vm1" }));
    fireEvent.click(screen.getByRole("button", { name: "recycle default/clubcrm-web-1" }));

    expect(onVmPowerAction).toHaveBeenCalledWith("vm1", "stop");
    expect(onContainerAction).toHaveBeenCalledWith("vm1", "nginx", "restart");
    expect(onPodRecycle).toHaveBeenCalledWith("default", "clubcrm-web-1");
  });

  it("disables buttons that are already in progress", () => {
    render(
      <ControlRail
        containers={{ vm1: [{ name: "nginx", status: "running" }] }}
        pendingActions={{ "vm:vm1:stop": true }}
        pods={[]}
        vms={[{ id: "vm1" }]}
        onContainerAction={vi.fn()}
        onPodRecycle={vi.fn()}
        onVmPowerAction={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "stop vm1" })).toBeDisabled();
  });
});

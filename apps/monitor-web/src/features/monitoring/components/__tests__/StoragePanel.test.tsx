import { render, screen } from "@testing-library/react";
import { StoragePanel } from "@/features/monitoring/components/StoragePanel";
import { createEmptySnapshot } from "@/features/monitoring/lib/snapshot";

describe("StoragePanel", () => {
  it("renders storage classes, pvcs, and longhorn volumes", () => {
    const snapshot = createEmptySnapshot();

    render(
      <StoragePanel
        kubernetes={{
          ...snapshot.kubernetes,
          storage_classes: [
            {
              name: "longhorn",
              provisioner: "driver.longhorn.io",
              is_default: false,
              volume_binding_mode: "Immediate",
              reclaim_policy: "Delete",
            },
          ],
          pvcs: [
            {
              namespace: "clubcrm-data",
              name: "postgres-data",
              status: "Bound",
              storage_class_name: "longhorn",
              requested_storage: "20Gi",
              volume_name: "pvc-123",
              volume_status: "Bound",
            },
          ],
          longhorn_volumes: [
            {
              namespace: "longhorn-system",
              name: "pvc-123",
              state: "attached",
              robustness: "healthy",
              size: "21474836480",
              node_id: "vm2",
              ready: true,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("longhorn")).toBeInTheDocument();
    expect(screen.getByText("postgres-data")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });
});

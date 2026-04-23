import type { MonitoringSnapshot } from "@/features/monitoring/types";

export function createEmptySnapshot(): MonitoringSnapshot {
  return {
    service: {
      target_url: "Unavailable",
      status: "down",
      uptime_percentage: 0,
      history: [],
      latest: null,
    },
    vms: [],
    containers: {},
    kubernetes: {
      connected: false,
      source: "unavailable",
      last_updated_at: null,
      nodes: [],
      pods: [],
      storage_classes: [],
      pvcs: [],
      longhorn_volumes: [],
    },
    demo: {
      failover_target: null,
      node_vm_map: {},
      ready_node_names: [],
      healthy_vm_count: 0,
      running_web_pods: [],
      standby_node_names: [],
    },
    events: [],
    generated_at: new Date(0).toISOString(),
  };
}

export function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 10000);
}

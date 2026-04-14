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
    events: [],
    generated_at: new Date(0).toISOString(),
  };
}

export function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 10000);
}

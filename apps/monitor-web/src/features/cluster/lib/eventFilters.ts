import type { ClusterEvent } from "@/features/cluster/types";

export const EVENT_CATEGORIES = ["nodes", "pods", "storage", "services", "causes"] as const;

export type ClusterEventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABEL: Record<ClusterEventCategory, string> = {
  nodes: "Nodes",
  pods: "Pods",
  storage: "Storage",
  services: "Services",
  causes: "Causes",
};

const EVENT_CATEGORY_MAP: Record<ClusterEvent["kind"], ClusterEventCategory> = {
  NODE_READY: "nodes",
  NODE_DOWN: "nodes",
  POD_CREATED: "pods",
  POD_MOVED: "pods",
  POD_CRASHED: "pods",
  POD_DELETED: "pods",
  POD_STATUS: "pods",
  VOLUME_ATTACHED: "storage",
  VOLUME_DETACHED: "storage",
  VOLUME_REATTACHED: "storage",
  VOLUME_FAULTED: "storage",
  VOLUME_HEALTH_CHANGED: "storage",
  REPLICA_HEALTH_CHANGED: "storage",
  PROBE_OK: "services",
  PROBE_DEGRADED: "services",
  PROBE_FAILED: "services",
  K8S_WARNING: "causes",
  CHAOS_STARTED: "causes",
  CHAOS_ENDED: "causes",
};

export function getEventCategory(event: ClusterEvent): ClusterEventCategory {
  return EVENT_CATEGORY_MAP[event.kind];
}

export function isEventVisible(
  event: ClusterEvent,
  selectedCategories: readonly ClusterEventCategory[]
): boolean {
  if (selectedCategories.length === 0) {
    return false;
  }

  return selectedCategories.includes(getEventCategory(event));
}

export function countEventsByCategory(
  events: readonly ClusterEvent[]
): Record<ClusterEventCategory, number> {
  return events.reduce<Record<ClusterEventCategory, number>>(
    (counts, event) => {
      counts[getEventCategory(event)] += 1;
      return counts;
    },
    {
      nodes: 0,
      pods: 0,
      storage: 0,
      services: 0,
      causes: 0,
    }
  );
}

import { describe, expect, it } from "vitest";
import {
  countEventsByCategory,
  getEventCategory,
  isEventVisible,
} from "@/features/cluster/lib/eventFilters";
import type { ClusterEvent } from "@/features/cluster/types";

const EVENTS: ClusterEvent[] = [
  {
    kind: "NODE_DOWN",
    ts: 1001,
    node: "server2",
  },
  {
    kind: "POD_MOVED",
    ts: 1002,
    namespace: "clubcrm",
    name: "api-1",
    from_node: "server1",
    to_node: "server2",
  },
  {
    kind: "VOLUME_FAULTED",
    ts: 1003,
    volume: "pvc-api-data",
    node_name: "server2",
    robustness: "faulted",
  },
  {
    kind: "PROBE_FAILED",
    ts: 1004,
    service: "clubcrm-web",
    url: "https://clubcrm.local",
    error: "timeout",
  },
  {
    kind: "K8S_WARNING",
    ts: 1005,
    involved_object_kind: "Pod",
    involved_object_namespace: "clubcrm",
    involved_object_name: "api-1",
    reason: "BackOff",
    message: "Back-off restarting failed container",
  },
];

describe("eventFilters", () => {
  it("maps event kinds to the expected categories", () => {
    expect(EVENTS.map((event) => getEventCategory(event))).toEqual([
      "nodes",
      "pods",
      "storage",
      "services",
      "causes",
    ]);
  });

  it("counts events per category", () => {
    expect(countEventsByCategory(EVENTS)).toEqual({
      nodes: 1,
      pods: 1,
      storage: 1,
      services: 1,
      causes: 1,
    });
  });

  it("shows only events from the selected categories", () => {
    expect(isEventVisible(EVENTS[0], ["nodes"])).toBe(true);
    expect(isEventVisible(EVENTS[1], ["nodes"])).toBe(false);
    expect(isEventVisible(EVENTS[3], ["services", "causes"])).toBe(true);
    expect(isEventVisible(EVENTS[4], [])).toBe(false);
  });
});

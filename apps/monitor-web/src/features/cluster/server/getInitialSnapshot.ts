import { getMonitorApiBaseUrl, getMonitorAdminToken } from "@/lib/env";
import type { ClusterEvent, ClusterSnapshot } from "@/features/cluster/types";

export function emptySnapshot(): ClusterSnapshot {
  return {
    type: "snapshot",
    ts: 0,
    nodes: [],
    pods: [],
    volumes: [],
    replicas: [],
    probes: [],
  };
}

export async function getInitialEventLog(): Promise<ClusterEvent[]> {
  const baseUrl = getMonitorApiBaseUrl();
  const adminToken = getMonitorAdminToken();
  const headers: Record<string, string> = {};
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }
  try {
    const response = await fetch(`${baseUrl}/api/events?limit=100`, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { events: ClusterEvent[] };
    return Array.isArray(payload.events) ? payload.events : [];
  } catch {
    return [];
  }
}

export async function getInitialClusterSnapshot(): Promise<ClusterSnapshot> {
  const baseUrl = getMonitorApiBaseUrl();
  const adminToken = getMonitorAdminToken();

  const headers: Record<string, string> = {};
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  try {
    const response = await fetch(`${baseUrl}/api/snapshot`, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) {
      return emptySnapshot();
    }
    const payload = (await response.json()) as ClusterSnapshot;
    if (payload && payload.type === "snapshot") {
      return payload;
    }
    return emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

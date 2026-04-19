import { createEmptySnapshot } from "@/features/monitoring/lib/snapshot";
import type { MonitoringSnapshot } from "@/features/monitoring/types";
import { getMonitorApiBaseUrl } from "@/lib/env";

export async function getInitialMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  try {
    const response = await fetch(`${getMonitorApiBaseUrl()}/api/snapshot`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return createEmptySnapshot();
    }
    return (await response.json()) as MonitoringSnapshot;
  } catch {
    return createEmptySnapshot();
  }
}

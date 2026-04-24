import { getMonitorAdminToken, getMonitorReplayApiUrl } from "@/lib/env";
import type { ClusterReplay } from "@/features/cluster/types";

export async function getClusterReplaySession(): Promise<ClusterReplay | null> {
  const replayUrl = getMonitorReplayApiUrl();
  const adminToken = getMonitorAdminToken();

  const headers: Record<string, string> = {};
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  try {
    const response = await fetch(replayUrl, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as ClusterReplay;
    if (payload && payload.type === "replay") {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

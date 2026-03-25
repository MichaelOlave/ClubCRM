import { apiFetch } from "@/lib/api/client";
import { env } from "@/lib/env/server";
import type { HealthCheckResult } from "@/features/health/types";

const API_BASE_URLS = [env.apiBaseUrl, "http://api:8000", "http://localhost:8000"].filter(
  (v): v is string => Boolean(v)
);

export async function getHealthCheck(): Promise<HealthCheckResult> {
  for (const baseUrl of API_BASE_URLS) {
    const endpoint = `${baseUrl.replace(/\/$/, "")}/health`;

    try {
      const response = await apiFetch(endpoint, { cache: "no-store" });

      if (!response.ok) {
        return {
          connected: false,
          status: "unhealthy",
          endpoint,
          details: `Health check returned HTTP ${response.status}.`,
        };
      }

      const payload = (await response.json()) as { status?: string };

      return {
        connected: payload.status === "ok",
        status: payload.status ?? "unknown",
        endpoint,
        details:
          payload.status === "ok"
            ? "API health check responded successfully."
            : "API responded, but the reported status was not ok.",
      };
    } catch {
      continue;
    }
  }

  return {
    connected: false,
    status: "offline",
    endpoint: API_BASE_URLS[0] ? `${API_BASE_URLS[0].replace(/\/$/, "")}/health` : "Unavailable",
    details: "Unable to reach the API health check from the web app.",
  };
}

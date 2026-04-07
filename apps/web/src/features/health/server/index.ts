import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls } from "@/lib/api/server";
import type {
  HealthCheckResult,
  LiveRoutingSnapshot,
  RuntimeInstance,
} from "@/features/health/types";

const API_BASE_URLS = getInternalApiBaseUrls();
const API_HEALTH_TIMEOUT_MS = 1000;

type ApiHealthPayload = {
  status?: string;
  runtime?: {
    service?: string;
    instance_id?: string;
    pod_name?: string | null;
    namespace?: string | null;
    node_name?: string | null;
    platform?: "kubernetes" | "local";
  };
};

export async function getHealthCheck(): Promise<HealthCheckResult> {
  for (const baseUrl of API_BASE_URLS) {
    const endpoint = buildApiUrl(baseUrl, "/health");
    const requestController = new AbortController();
    const abortTimeout = setTimeout(() => {
      requestController.abort();
    }, API_HEALTH_TIMEOUT_MS);

    try {
      const response = await apiFetch(endpoint, {
        cache: "no-store",
        signal: requestController.signal,
      });

      if (!response.ok) {
        return {
          connected: false,
          status: "unhealthy",
          endpoint,
          details: `Health check returned HTTP ${response.status}.`,
          apiRuntime: null,
        };
      }

      const payload = (await response.json()) as ApiHealthPayload;

      return {
        connected: payload.status === "ok",
        status: payload.status ?? "unknown",
        endpoint,
        details:
          payload.status === "ok"
            ? "API health check responded successfully."
            : "API responded, but the reported status was not ok.",
        apiRuntime: mapRuntimeInstance(payload.runtime),
      };
    } catch {
      continue;
    } finally {
      clearTimeout(abortTimeout);
    }
  }

  return {
    connected: false,
    status: "offline",
    endpoint: API_BASE_URLS[0] ? buildApiUrl(API_BASE_URLS[0], "/health") : "Unavailable",
    details: "Unable to reach the API health check from the web app.",
    apiRuntime: null,
  };
}

export async function getLiveRoutingSnapshot(): Promise<LiveRoutingSnapshot> {
  const health = await getHealthCheck();

  return {
    checkedAt: new Date().toISOString(),
    webRuntime: getCurrentWebRuntime(),
    api: {
      connected: health.connected,
      status: health.status,
      endpoint: health.endpoint,
      runtime: health.apiRuntime,
    },
  };
}

function getCurrentWebRuntime(): RuntimeInstance {
  const instanceId = process.env.POD_NAME ?? process.env.HOSTNAME ?? "unknown";
  const isKubernetes = Boolean(process.env.KUBERNETES_SERVICE_HOST);

  return {
    service: "clubcrm-web",
    instanceId,
    podName: isKubernetes ? instanceId : null,
    namespace: process.env.POD_NAMESPACE ?? null,
    nodeName: process.env.NODE_NAME ?? null,
    platform: isKubernetes ? "kubernetes" : "local",
  };
}

function mapRuntimeInstance(runtime: ApiHealthPayload["runtime"]): RuntimeInstance | null {
  if (!runtime?.service || !runtime.instance_id || !runtime.platform) {
    return null;
  }

  return {
    service: runtime.service,
    instanceId: runtime.instance_id,
    podName: runtime.pod_name ?? null,
    namespace: runtime.namespace ?? null,
    nodeName: runtime.node_name ?? null,
    platform: runtime.platform,
  };
}

import {
  getDashboardRedisAnalyticsApi,
  getDashboardSummaryApi,
} from "@/lib/api/clubcrm";
import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls } from "@/lib/api/server";
import type { AuthorizedBackendAuthSession } from "@/features/auth/types";
import { getClubList } from "@/features/clubs/server";
import type {
  HealthCheckResult,
  LiveRoutingSnapshot,
  RedisDiagnosticsViewModel,
  RuntimeInstance,
} from "@/features/health/types";
import type {
  BackendDashboardRedisAnalyticsRecord,
  BackendDashboardSummaryRecord,
} from "@/types/api";

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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatTtl(ttlSeconds: number | null): string {
  if (ttlSeconds === null) {
    return "Not cached yet";
  }

  if (ttlSeconds < 60) {
    return `${ttlSeconds}s remaining`;
  }

  return `${Math.ceil(ttlSeconds / 60)}m remaining`;
}

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

type RedisDiagnosticsSnapshot = {
  club: Awaited<ReturnType<typeof getClubList>>[number];
  redisAnalytics: BackendDashboardRedisAnalyticsRecord;
  summary: BackendDashboardSummaryRecord;
};

export async function getRedisDiagnosticsViewModel(
  session: AuthorizedBackendAuthSession
): Promise<RedisDiagnosticsViewModel> {
  const clubs = await getClubList(session);
  const snapshots: RedisDiagnosticsSnapshot[] = await Promise.all(
    clubs.map(async (club) => {
      const [summary, redisAnalytics] = await Promise.all([
        getDashboardSummaryApi(club.id),
        getDashboardRedisAnalyticsApi(club.id),
      ]);

      return { club, redisAnalytics, summary };
    })
  );

  const totalRequests = snapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.request_count,
    0
  );
  const totalHits = snapshots.reduce((count, entry) => count + entry.redisAnalytics.hit_count, 0);
  const totalRefreshes = snapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.refresh_count,
    0
  );
  const totalInvalidations = snapshots.reduce(
    (count, entry) => count + entry.redisAnalytics.invalidation_count,
    0
  );
  const warmClubCount = snapshots.filter((entry) => entry.redisAnalytics.cache_present).length;
  const aggregateHitRate = totalRequests ? totalHits / totalRequests : 0;
  const warmClubLabel = clubs.length ? `${warmClubCount}/${clubs.length}` : "0/0";
  const clubSummaries = snapshots
    .map(({ club, redisAnalytics, summary }) => ({
      clubId: club.id,
      clubName: club.name,
      totalMembers: summary.total_members,
      totalEvents: summary.total_events,
      totalAnnouncements: summary.total_announcements,
      cacheStatus: redisAnalytics.status,
      cacheDetail: redisAnalytics.error ?? formatTtl(redisAnalytics.ttl_seconds),
      hitRate: formatPercent(redisAnalytics.hit_rate),
      requestCount: `${redisAnalytics.request_count} requests`,
    }))
    .sort((left, right) => left.clubName.localeCompare(right.clubName));
  const warmTtlSeconds =
    snapshots
      .map((entry) => entry.redisAnalytics.ttl_seconds)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => right - left)[0] ?? null;

  return {
    operations: {
      title: "Cache operations",
      description:
        "Operational telemetry for the Redis-backed dashboard summaries, including warmth, hit rate, and invalidation activity.",
      metrics: [
        {
          label: "Warm club caches",
          value: warmClubLabel,
          detail:
            "Accessible club summaries currently served from Redis instead of requiring a full rebuild.",
          tone: warmClubCount ? "success" : "warning",
        },
        {
          label: "Cache hit rate",
          value: formatPercent(aggregateHitRate),
          detail: `${totalHits} cache hits across ${totalRequests} dashboard summary requests.`,
          tone: totalHits ? "success" : "warning",
        },
        {
          label: "Refresh / invalidation",
          value: `${totalRefreshes}/${totalInvalidations}`,
          detail:
            "Refreshes count repopulations after misses, while invalidations track writes that clear stale club summaries.",
          tone: "default",
        },
      ],
      clubSummaries,
    },
    experience: {
      title: "Freshness and fallback",
      description:
        "What the cache means for the people using the product: warm reads, short-lived summaries, and a safe Postgres fallback.",
      metrics: [
        {
          label: "Ready summaries",
          value: `${warmClubCount}`,
          detail: "Club overviews already staged in Redis for the next dashboard read.",
          tone: warmClubCount ? "success" : "warning",
        },
        {
          label: "Freshness window",
          value: warmTtlSeconds === null ? "Cold cache" : formatTtl(warmTtlSeconds),
          detail:
            "Dashboard summaries expire quickly so Redis stays a speed layer instead of becoming the system of record.",
          tone: warmTtlSeconds === null ? "warning" : "default",
        },
        {
          label: "Fallback path",
          value: "Postgres-backed",
          detail:
            "If Redis is cold or unavailable, the dashboard still rebuilds its summary from canonical relational data.",
          tone: "default",
        },
      ],
      clubSummaries,
    },
  };
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const DEFAULT_MONITOR_PUBLIC_API_BASE_URL = "/monitor-api";
const DEFAULT_CLUBCRM_DEMO_URL = "https://demo.clubcrm.org/demo/failover";

export function getMonitorApiBaseUrl() {
  return trimTrailingSlash(
    process.env.MONITOR_API_BASE_URL ??
      process.env.NEXT_PUBLIC_MONITOR_API_BASE_URL ??
      "http://localhost:8010"
  );
}

export function getMonitorPublicApiBaseUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_MONITOR_API_BASE_URL ?? DEFAULT_MONITOR_PUBLIC_API_BASE_URL
  );
}

export function getMonitorWebSocketUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_MONITOR_WS_URL;
  if (explicitUrl) {
    return explicitUrl;
  }
  const baseUrl = getMonitorPublicApiBaseUrl();
  if (/^https?:\/\//.test(baseUrl)) {
    return `${baseUrl.replace(/^http/, "ws")}/ws/stream`;
  }
  return `${baseUrl}/ws/stream`;
}

export function getMonitorAdminToken(): string | null {
  const token = process.env.MONITOR_ADMIN_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export function getMonitorReplayApiUrl() {
  const explicitUrl =
    process.env.MONITOR_REPLAY_API_URL ?? process.env.NEXT_PUBLIC_MONITOR_REPLAY_API_URL;
  if (explicitUrl) {
    return trimTrailingSlash(explicitUrl);
  }
  return `${getMonitorApiBaseUrl()}/api/replay`;
}

export function isMonitorReplayModeEnabled() {
  const value =
    process.env.MONITOR_REPLAY_MODE ?? process.env.NEXT_PUBLIC_MONITOR_REPLAY_MODE ?? "false";
  return value.trim().toLowerCase() === "true";
}

export function getClubCrmDemoUrl() {
  return (
    process.env.NEXT_PUBLIC_CLUBCRM_DEMO_URL ??
    process.env.CLUBCRM_DEMO_URL ??
    DEFAULT_CLUBCRM_DEMO_URL
  );
}

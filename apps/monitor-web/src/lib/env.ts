function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getMonitorApiBaseUrl() {
  return trimTrailingSlash(
    process.env.MONITOR_API_BASE_URL ??
      process.env.NEXT_PUBLIC_MONITOR_API_BASE_URL ??
      "http://localhost:8010"
  );
}

export function getMonitorPublicApiBaseUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_MONITOR_API_BASE_URL ??
      process.env.MONITOR_API_BASE_URL ??
      "http://localhost:8010"
  );
}

export function getMonitorWebSocketUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_MONITOR_WS_URL;
  if (explicitUrl) {
    return explicitUrl;
  }
  const baseUrl = getMonitorPublicApiBaseUrl();
  return `${baseUrl.replace(/^http/, "ws")}/ws/stream`;
}

export function getMonitorAdminToken(): string | null {
  const token = process.env.MONITOR_ADMIN_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

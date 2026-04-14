function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const DEFAULT_CLUBCRM_DEMO_PATH = "/demo/failover";
const FALLBACK_CLUBCRM_DEMO_PATH = "/system/health";

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

export function getMonitorAdminToken() {
  return process.env.MONITOR_ADMIN_TOKEN ?? "monitor-admin-token";
}

export function getClubcrmDemoUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_CLUBCRM_DEMO_URL ??
    process.env.CLUBCRM_DEMO_URL ??
    `http://clubcrm.local${DEFAULT_CLUBCRM_DEMO_PATH}`;

  return normalizeClubcrmDemoUrl(rawUrl);
}

export async function resolveClubcrmDemoUrl() {
  const preferredUrl = getClubcrmDemoUrl();
  const candidates = buildClubcrmDemoUrlCandidates(preferredUrl);

  for (const candidate of candidates) {
    if (await isReachableClubcrmUrl(candidate)) {
      return candidate;
    }
  }

  return preferredUrl;
}

function normalizeClubcrmDemoUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    if (url.pathname === "/" || url.pathname === "/login") {
      url.pathname = DEFAULT_CLUBCRM_DEMO_PATH;
      url.search = "";
      url.hash = "";
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function buildClubcrmDemoUrlCandidates(preferredUrl: string) {
  try {
    const preferred = new URL(preferredUrl);
    const candidates = [
      preferred.toString(),
      new URL(DEFAULT_CLUBCRM_DEMO_PATH, preferred).toString(),
      new URL(FALLBACK_CLUBCRM_DEMO_PATH, preferred).toString(),
    ];

    return Array.from(new Set(candidates));
  } catch {
    return [preferredUrl];
  }
}

async function isReachableClubcrmUrl(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
    });

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

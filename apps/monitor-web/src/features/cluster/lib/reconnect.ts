export function getReconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 10000);
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function resolveClusterStreamUrl(streamUrl: string, currentLocation?: string | URL): string {
  if (!streamUrl) {
    return streamUrl;
  }

  const locationSource =
    currentLocation ?? (typeof window !== "undefined" ? window.location.href : undefined);
  if (!locationSource) {
    return streamUrl;
  }

  let resolvedUrl: URL;
  try {
    resolvedUrl = new URL(streamUrl, locationSource);
  } catch {
    return streamUrl;
  }

  const pageUrl = new URL(locationSource);

  if (resolvedUrl.protocol === "http:") {
    resolvedUrl.protocol = "ws:";
  } else if (resolvedUrl.protocol === "https:") {
    resolvedUrl.protocol = "wss:";
  }

  if (pageUrl.protocol === "https:" && resolvedUrl.protocol === "ws:") {
    resolvedUrl.protocol = "wss:";
  }

  if (LOOPBACK_HOSTS.has(resolvedUrl.hostname) && !LOOPBACK_HOSTS.has(pageUrl.hostname)) {
    resolvedUrl.hostname = pageUrl.hostname;
  }

  return resolvedUrl.toString();
}

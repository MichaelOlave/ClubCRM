import { env } from "@/lib/env/server";

const INTERNAL_API_BASE_URLS = [env.apiBaseUrl, "http://api:8000", "http://localhost:8000"].filter(
  (value): value is string => Boolean(value)
);

export function getInternalApiBaseUrls(): string[] {
  return INTERNAL_API_BASE_URLS;
}

export function getPublicApiBaseUrl(): string {
  return (env.webApiPublicBaseUrl ?? "http://localhost:8000").replace(/\/$/, "");
}

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
}

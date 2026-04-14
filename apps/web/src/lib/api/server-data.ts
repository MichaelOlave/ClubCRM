import { cookies, headers } from "next/headers";

import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls } from "@/lib/api/server";
import { env } from "@/lib/env/server";

type ApiJsonResponse<T> = {
  data: T;
  endpoint: string;
};

export class ApiResponseError extends Error {
  detail: string | null;
  endpoint: string;
  status: number;

  constructor(endpoint: string, status: number, detail: string | null = null) {
    super(
      detail
        ? `API request to ${endpoint} returned HTTP ${status}: ${detail}`
        : `API request to ${endpoint} returned HTTP ${status}.`
    );
    this.name = "ApiResponseError";
    this.detail = detail;
    this.endpoint = endpoint;
    this.status = status;
  }
}

async function getErrorDetail(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { detail?: unknown };

      return typeof body.detail === "string" ? body.detail : null;
    }

    const body = (await response.text()).trim();

    return body || null;
  } catch {
    return null;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiResponseError) {
    return error.detail ?? fallback;
  }

  return fallback;
}

async function buildForwardedHeaders(init?: RequestInit): Promise<Headers> {
  const forwardedHeaders = new Headers(init?.headers);
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie");

  if (cookieHeader && !forwardedHeaders.has("cookie")) {
    forwardedHeaders.set("cookie", cookieHeader);
  }

  const method = (init?.method ?? "GET").toUpperCase();
  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    !forwardedHeaders.has(env.authCsrfHeaderName)
  ) {
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get(env.authCsrfCookieName)?.value;
    if (csrfToken) {
      forwardedHeaders.set(env.authCsrfHeaderName, csrfToken);
    }
  }

  return forwardedHeaders;
}

export async function fetchApiJson<T>(
  path: string,
  init?: RequestInit
): Promise<ApiJsonResponse<T>> {
  for (const baseUrl of getInternalApiBaseUrls()) {
    const endpoint = buildApiUrl(baseUrl, path);

    try {
      const response = await apiFetch(endpoint, {
        cache: init?.cache ?? "no-store",
        ...init,
        headers: await buildForwardedHeaders(init),
      });

      if (!response.ok) {
        throw new ApiResponseError(endpoint, response.status, await getErrorDetail(response));
      }

      return {
        data: (await response.json()) as T,
        endpoint,
      };
    } catch (error) {
      if (error instanceof ApiResponseError) {
        throw error;
      }

      continue;
    }
  }

  const fallbackEndpoint = buildApiUrl(
    getInternalApiBaseUrls()[0] ?? "http://localhost:8000",
    path
  );

  throw new Error(`Unable to reach the API endpoint at ${fallbackEndpoint}.`);
}

export async function fetchApiJsonOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return (await fetchApiJson<T>(path, init)).data;
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

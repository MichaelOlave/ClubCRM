import { headers } from "next/headers";

import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls, getPublicApiBaseUrl } from "@/lib/api/server";
import type { BackendAuthSession } from "@/features/auth/types";

export type BackendAuthSessionResult =
  | {
      endpoint: string;
      session: BackendAuthSession;
      status: "available";
    }
  | {
      details: string;
      endpoint: string;
      status: "error";
    };

export function getBackendLoginUrl(): string {
  return buildApiUrl(getPublicApiBaseUrl(), "/auth/login");
}

export async function getBackendAuthSession(): Promise<BackendAuthSessionResult> {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie");

  for (const baseUrl of getInternalApiBaseUrls()) {
    const endpoint = buildApiUrl(baseUrl, "/auth/session");

    try {
      const response = await apiFetch(endpoint, {
        cache: "no-store",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      });

      if (!response.ok) {
        return {
          status: "error",
          endpoint,
          details: `Auth session returned HTTP ${response.status}.`,
        };
      }

      const payload = (await response.json()) as BackendAuthSession;

      return {
        status: "available",
        endpoint,
        session: payload,
      };
    } catch {
      continue;
    }
  }

  return {
    status: "error",
    endpoint: buildApiUrl(getInternalApiBaseUrls()[0] ?? "http://localhost:8000", "/auth/session"),
    details: "Unable to reach the backend auth session from the web app.",
  };
}

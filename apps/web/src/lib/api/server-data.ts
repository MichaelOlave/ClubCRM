import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls } from "@/lib/api/server";

type ApiJsonResponse<T> = {
  data: T;
  endpoint: string;
};

export class ApiResponseError extends Error {
  endpoint: string;
  status: number;

  constructor(endpoint: string, status: number) {
    super(`API request to ${endpoint} returned HTTP ${status}.`);
    this.name = "ApiResponseError";
    this.endpoint = endpoint;
    this.status = status;
  }
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
      });

      if (!response.ok) {
        throw new ApiResponseError(endpoint, response.status);
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

import { NextRequest, NextResponse } from "next/server";

import { getBackendLoginUrl } from "@/features/auth/server/authApi";
import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls, getPublicApiBaseUrl } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const backendLoginUrl = getBackendLoginUrl();
  const cookieHeader = request.headers.get("cookie");
  const publicApiUrl = new URL(getPublicApiBaseUrl());
  const forwardedHeaders = {
    cookie: cookieHeader ?? "",
    host: publicApiUrl.host,
    "x-forwarded-host": publicApiUrl.host,
    "x-forwarded-proto": publicApiUrl.protocol.replace(/:$/, ""),
  };

  for (const baseUrl of getInternalApiBaseUrls()) {
    try {
      const response = await apiFetch(buildApiUrl(baseUrl, "/auth/login"), {
        cache: "no-store",
        redirect: "manual",
        headers: forwardedHeaders,
      });
      const location = response.headers.get("location");

      if (location) {
        const nextResponse = NextResponse.redirect(location, response.status);

        for (const cookie of response.headers.getSetCookie()) {
          nextResponse.headers.append("set-cookie", cookie);
        }

        return nextResponse;
      }

      const errorResponse = new NextResponse(await response.text(), {
        status: response.status,
      });
      const contentType = response.headers.get("content-type");

      if (contentType) {
        errorResponse.headers.set("content-type", contentType);
      }

      return errorResponse;
    } catch {
      continue;
    }
  }

  return NextResponse.redirect(backendLoginUrl);
}

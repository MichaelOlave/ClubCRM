import { NextRequest, NextResponse } from "next/server";

import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls, getPublicApiBaseUrl } from "@/lib/api/server";

const APP_REDIRECT_HEADER = "x-clubcrm-app-redirect";
const PROXIED_AUTH_REQUEST_HEADER = "x-clubcrm-proxied-auth";

type AuthProxyPath = "/auth/callback" | "/auth/login";

function appendSetCookies(source: Response, target: NextResponse) {
  for (const cookie of source.headers.getSetCookie()) {
    target.headers.append("set-cookie", cookie);
  }
}

function buildCurrentOriginRedirect(location: string, request: NextRequest): string {
  const parsedLocation = new URL(location, request.nextUrl.origin);
  const currentOriginPath = `${parsedLocation.pathname}${parsedLocation.search}${parsedLocation.hash}`;

  return new URL(currentOriginPath, request.nextUrl.origin).toString();
}

function buildAuthProxyHeaders(request: NextRequest): HeadersInit {
  const requestHost = request.headers.get("host") ?? request.nextUrl.host;
  const cookieHeader = request.headers.get("cookie");

  return {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    host: requestHost,
    "x-forwarded-host": requestHost,
    "x-forwarded-proto": request.nextUrl.protocol.replace(/:$/, ""),
    [PROXIED_AUTH_REQUEST_HEADER]: "1",
  };
}

export async function proxyAuthRoute(
  request: NextRequest,
  path: AuthProxyPath
): Promise<NextResponse> {
  const requestPath = `${path}${request.nextUrl.search}`;
  const forwardedHeaders = buildAuthProxyHeaders(request);

  for (const baseUrl of getInternalApiBaseUrls()) {
    try {
      const response = await apiFetch(buildApiUrl(baseUrl, requestPath), {
        cache: "no-store",
        redirect: "manual",
        headers: forwardedHeaders,
      });
      const location = response.headers.get("location");

      if (location) {
        const nextResponse = NextResponse.redirect(
          response.headers.get(APP_REDIRECT_HEADER) === "1"
            ? buildCurrentOriginRedirect(location, request)
            : location,
          response.status
        );

        appendSetCookies(response, nextResponse);
        return nextResponse;
      }

      const nextResponse = new NextResponse(await response.text(), {
        status: response.status,
      });
      const contentType = response.headers.get("content-type");

      if (contentType) {
        nextResponse.headers.set("content-type", contentType);
      }

      appendSetCookies(response, nextResponse);
      return nextResponse;
    } catch {
      continue;
    }
  }

  return NextResponse.redirect(buildApiUrl(getPublicApiBaseUrl(), requestPath));
}

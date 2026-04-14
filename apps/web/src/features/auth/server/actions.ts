"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { buildApiUrl, getInternalApiBaseUrls } from "@/lib/api/server";
import { env } from "@/lib/env/server";

const APP_REDIRECT_HEADER = "x-clubcrm-app-redirect";

function expireCookie(name: string) {
  return {
    name,
    value: "",
    maxAge: 0,
    path: "/",
  } as const;
}

export async function logout() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const cookieHeader = requestHeaders.get("cookie");
  const csrfToken = cookieStore.get(env.authCsrfCookieName)?.value;

  let redirectUrl = "/login";

  if (cookieHeader && csrfToken) {
    for (const baseUrl of getInternalApiBaseUrls()) {
      const endpoint = buildApiUrl(baseUrl, "/auth/logout");

      try {
        const response = await apiFetch(endpoint, {
          method: "POST",
          cache: "no-store",
          redirect: "manual",
          headers: {
            cookie: cookieHeader,
            [env.authCsrfHeaderName]: csrfToken,
          },
        });

        const nextLocation = response.headers.get("location");
        if (!nextLocation) {
          continue;
        }

        if (response.headers.get(APP_REDIRECT_HEADER) === "1") {
          const appRedirectUrl = new URL(nextLocation, "http://clubcrm.local");
          redirectUrl = `${appRedirectUrl.pathname}${appRedirectUrl.search}${appRedirectUrl.hash}`;
        } else {
          redirectUrl = nextLocation;
        }
        break;
      } catch {
        continue;
      }
    }
  }

  cookieStore.set(expireCookie(env.authSessionCookieName));
  cookieStore.set(expireCookie(env.authCsrfCookieName));

  redirect(redirectUrl);
}

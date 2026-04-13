import { cookies, headers } from "next/headers";

import { env } from "@/lib/env/server";

type Options = {
  includeCsrf?: boolean;
};

export async function getJoinRequestApiAuthHeaders({
  includeCsrf = false,
}: Options = {}): Promise<Headers> {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers();
  const cookieHeader = requestHeaders.get("cookie");

  if (cookieHeader) {
    forwardedHeaders.set("cookie", cookieHeader);
  }

  if (includeCsrf) {
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get(env.authCsrfCookieName)?.value;

    if (csrfToken) {
      forwardedHeaders.set(env.authCsrfHeaderName, csrfToken);
    }
  }

  return forwardedHeaders;
}

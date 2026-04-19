import { cookies, headers } from "next/headers";

import { env } from "@/lib/env/server";

const ORIGIN_PATH_HEADER_NAME = "X-ClubCRM-Origin-Path";

type Options = {
  includeCsrf?: boolean;
  originPath?: string;
};

export async function getAdminApiHeaders({
  includeCsrf = false,
  originPath,
}: Options = {}): Promise<Headers> {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers();
  const cookieHeader = requestHeaders.get("cookie");
  const referer = requestHeaders.get("referer");

  if (cookieHeader) {
    forwardedHeaders.set("cookie", cookieHeader);
  }

  if (originPath) {
    forwardedHeaders.set(ORIGIN_PATH_HEADER_NAME, originPath);
  } else if (referer) {
    forwardedHeaders.set("referer", referer);
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

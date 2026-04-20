import { NextResponse } from "next/server";
import { env } from "@/lib/env/server";

type RecycleRequestBody = {
  namespace?: string;
  podName?: string;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export async function POST(request: Request) {
  const { namespace, podName } = (await request.json().catch(() => ({}))) as RecycleRequestBody;

  if (!namespace || !podName) {
    return NextResponse.json(
      { detail: "The active ClubCRM web pod could not be identified for recycle." },
      { status: 400 }
    );
  }

  if (!env.monitorApiBaseUrl) {
    return NextResponse.json(
      { detail: "MONITOR_API_BASE_URL is not configured for the public failover trigger." },
      { status: 500 }
    );
  }

  const response = await fetch(
    `${trimTrailingSlash(env.monitorApiBaseUrl)}/api/control/k8s/pods/${namespace}/${podName}/recycle`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.monitorAdminToken}`,
      },
      body: JSON.stringify({ action: "recycle" }),
      cache: "no-store",
    }
  );

  return NextResponse.json(await response.json(), { status: response.status });
}

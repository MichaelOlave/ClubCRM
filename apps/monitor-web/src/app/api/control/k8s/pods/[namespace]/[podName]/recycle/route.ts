import { NextResponse } from "next/server";
import { getMonitorAdminToken, getMonitorApiBaseUrl } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ namespace: string; podName: string }> }
) {
  const { namespace, podName } = await params;
  const response = await fetch(
    `${getMonitorApiBaseUrl()}/api/control/k8s/pods/${namespace}/${podName}/recycle`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getMonitorAdminToken()}`,
      },
      body: JSON.stringify({ action: "recycle" }),
      cache: "no-store",
    }
  );

  return NextResponse.json(await response.json(), { status: response.status });
}

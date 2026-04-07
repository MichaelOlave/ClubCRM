import { NextRequest, NextResponse } from "next/server";
import { getMonitorAdminToken, getMonitorApiBaseUrl } from "@/lib/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vmId: string; containerName: string }> },
) {
  const { vmId, containerName } = await params;
  const body = await request.json();
  const response = await fetch(
    `${getMonitorApiBaseUrl()}/api/control/containers/${vmId}/${containerName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getMonitorAdminToken()}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  return NextResponse.json(await response.json(), { status: response.status });
}

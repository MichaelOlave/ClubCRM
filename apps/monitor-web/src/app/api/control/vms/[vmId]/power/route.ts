import { NextRequest, NextResponse } from "next/server";
import { getMonitorAdminToken, getMonitorApiBaseUrl } from "@/lib/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vmId: string }> },
) {
  const { vmId } = await params;
  const body = await request.json();
  const response = await fetch(`${getMonitorApiBaseUrl()}/api/control/vms/${vmId}/power`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMonitorAdminToken()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}

import { NextResponse } from "next/server";
import { getMonitorApiBaseUrl } from "@/lib/env";

export async function GET() {
  const response = await fetch(`${getMonitorApiBaseUrl()}/api/snapshot`, {
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}

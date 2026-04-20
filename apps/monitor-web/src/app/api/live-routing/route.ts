import { NextResponse } from "next/server";
import { getClubcrmLiveRoutingUrl, resolveClubcrmDemoUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const demoUrl = await resolveClubcrmDemoUrl();
    const liveRoutingUrl = getClubcrmLiveRoutingUrl(demoUrl);
    const response = await fetch(liveRoutingUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: `Live routing request failed with HTTP ${response.status}.` },
        { status: response.status }
      );
    }

    const payload = await response.json();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the live ClubCRM failover endpoint." },
      { status: 502 }
    );
  }
}

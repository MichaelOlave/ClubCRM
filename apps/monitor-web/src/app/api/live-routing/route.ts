import { NextResponse } from "next/server";
import { getMonitorApiBaseUrl, resolveClubcrmDemoUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${getMonitorApiBaseUrl()}/api/live-routing`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const payload = await response.json();
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    const fallbackResponse = await fetch(buildLiveRoutingUrl(await resolveClubcrmDemoUrl()), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!fallbackResponse.ok) {
      return NextResponse.json(
        { detail: `Live routing request failed with HTTP ${fallbackResponse.status}.` },
        { status: fallbackResponse.status }
      );
    }

    return NextResponse.json(await fallbackResponse.json(), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    try {
      const fallbackResponse = await fetch(buildLiveRoutingUrl(await resolveClubcrmDemoUrl()), {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (fallbackResponse.ok) {
        return NextResponse.json(await fallbackResponse.json(), {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        });
      }
    } catch {}

    return NextResponse.json(
      { detail: "Unable to reach the live ClubCRM failover endpoint." },
      { status: 502 }
    );
  }
}

function buildLiveRoutingUrl(demoUrl: string) {
  try {
    return new URL("/system/health/live-routing", demoUrl).toString();
  } catch {
    return demoUrl;
  }
}

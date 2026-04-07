import { NextResponse } from "next/server";

import { getLiveRoutingSnapshot } from "@/features/health/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getLiveRoutingSnapshot(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

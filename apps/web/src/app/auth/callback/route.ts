import { NextRequest } from "next/server";

import { proxyAuthRoute } from "@/features/auth/server/authProxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthRoute(request, "/auth/callback");
}

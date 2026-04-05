import { NextResponse } from "next/server";

import { getBackendLoginUrl } from "@/features/auth/server/authApi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(getBackendLoginUrl());
}

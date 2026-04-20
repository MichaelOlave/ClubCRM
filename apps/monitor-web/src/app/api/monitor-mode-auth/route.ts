import { NextResponse } from "next/server";
import {
  CONTROL_MODE_COOKIE_MAX_AGE_SECONDS,
  getControlModeCookieName,
  getControlModeSessionValue,
  isControlModeProtectionEnabled,
  isValidControlModePassword,
} from "@/lib/env";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = payload?.password?.trim();

  if (!isControlModeProtectionEnabled()) {
    return NextResponse.json({ unlocked: true });
  }

  if (!password) {
    return NextResponse.json(
      { detail: "Enter the control mode password to unlock this view." },
      { status: 400 }
    );
  }

  if (!isValidControlModePassword(password)) {
    return NextResponse.json({ detail: "Incorrect control mode password." }, { status: 401 });
  }

  const sessionValue = getControlModeSessionValue();
  if (!sessionValue) {
    return NextResponse.json(
      { detail: "Control mode password is not configured." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ unlocked: true });
  response.cookies.set({
    httpOnly: true,
    maxAge: CONTROL_MODE_COOKIE_MAX_AGE_SECONDS,
    name: getControlModeCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: sessionValue,
  });
  return response;
}

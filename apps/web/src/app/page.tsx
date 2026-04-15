import { redirect } from "next/navigation";

import {
  isAuthenticatedBackendAuthSession,
  isAuthorizedBackendAuthSession,
} from "@/features/auth/server";
import { getBackendAuthSession } from "@/features/auth/server/authApi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionResult = await getBackendAuthSession();

  if (sessionResult.status !== "available") {
    redirect("/login");
  }

  if (isAuthorizedBackendAuthSession(sessionResult.session)) {
    redirect("/dashboard");
  }

  redirect(
    isAuthenticatedBackendAuthSession(sessionResult.session) ? "/not-provisioned" : "/login"
  );
}

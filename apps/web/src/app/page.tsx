import { redirect } from "next/navigation";

import { getBackendAuthSession } from "@/features/auth/server/authApi";
import {
  isAuthenticatedBackendAuthSession,
  isAuthorizedBackendAuthSession,
} from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionResult = await getBackendAuthSession();

  if (
    sessionResult.status === "available" &&
    isAuthorizedBackendAuthSession(sessionResult.session)
  ) {
    redirect("/dashboard");
  }

  if (
    sessionResult.status === "available" &&
    isAuthenticatedBackendAuthSession(sessionResult.session)
  ) {
    redirect("/not-provisioned");
  }

  redirect("/login");
}

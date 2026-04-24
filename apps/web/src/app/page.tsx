import { LandingPage } from "@/features/landing/components/LandingPage";
import { isAuthorizedBackendAuthSession } from "@/features/auth/server";
import { getBackendAuthSession } from "@/features/auth/server/authApi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionResult = await getBackendAuthSession();
  const isAuthorized =
    sessionResult.status === "available" && isAuthorizedBackendAuthSession(sessionResult.session);

  return <LandingPage isAuthorized={isAuthorized} />;
}

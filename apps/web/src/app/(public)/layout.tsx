import { PublicShell } from "@/components/layout/PublicShell";
import { isAuthorizedBackendAuthSession } from "@/features/auth/server";
import { getBackendAuthSession } from "@/features/auth/server/authApi";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionResult = await getBackendAuthSession();
  const isAuthorized =
    sessionResult.status === "available" && isAuthorizedBackendAuthSession(sessionResult.session);

  return <PublicShell isAuthorized={isAuthorized}>{children}</PublicShell>;
}

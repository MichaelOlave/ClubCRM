import { redirect } from "next/navigation";

import { getBackendAuthSession } from "@/features/auth/server/authApi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sessionResult = await getBackendAuthSession();

  if (sessionResult.status === "available" && sessionResult.session.authenticated) {
    redirect("/dashboard");
  }

  redirect("/login");
}

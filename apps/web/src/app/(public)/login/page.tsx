import { redirect } from "next/navigation";

import { LoginForm, TestLoginForm } from "@/features/auth";
import { getLoginViewModel } from "@/features/auth/server";
import { env } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (env.isAuthBypass) {
    return <TestLoginForm />;
  }

  const viewModel = await getLoginViewModel();

  if (viewModel.status === "not-provisioned") {
    redirect("/not-provisioned");
  }

  return <LoginForm {...viewModel} />;
}

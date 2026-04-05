import { LoginForm } from "@/features/auth";
import { getLoginViewModel } from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const viewModel = await getLoginViewModel();

  return <LoginForm {...viewModel} />;
}

import { redirect } from "next/navigation";

import { NotProvisionedCard } from "@/features/auth";
import { getLoginViewModel } from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function NotProvisionedPage() {
  const viewModel = await getLoginViewModel();

  if (viewModel.status === "authorized") {
    redirect("/dashboard");
  }

  if (viewModel.status !== "not-provisioned") {
    redirect("/login");
  }

  return <NotProvisionedCard {...viewModel} />;
}

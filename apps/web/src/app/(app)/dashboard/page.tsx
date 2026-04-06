import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardOverview } from "@/features/dashboard";
import { getDashboardViewModel } from "@/features/dashboard/server";

export default async function DashboardPage() {
  const viewModel = await getDashboardViewModel();
  const previewJoinHref =
    viewModel.quickActions.find((action) => action.href.startsWith("/join/"))?.href ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/clubs">Browse clubs</Link>
            </Button>
            {previewJoinHref ? (
              <Button asChild variant="ghost">
                <Link href={previewJoinHref}>Preview join form</Link>
              </Button>
            ) : null}
          </>
        }
        description="This product-facing overview now keeps the same route and shell structure while rendering live backend data."
        eyebrow="Dashboard"
        title="Admin overview"
      />

      <DashboardOverview viewModel={viewModel} />
    </div>
  );
}

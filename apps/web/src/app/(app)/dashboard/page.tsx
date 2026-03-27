import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardOverview } from "@/features/dashboard";
import { getDashboardViewModel } from "@/features/dashboard/server";

export default async function DashboardPage() {
  const viewModel = await getDashboardViewModel();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/clubs">Browse clubs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/join/chess-society">Preview join form</Link>
            </Button>
          </>
        }
        description="This is the new product-facing home for the frontend MVP. It shows how route groups, feature-owned pages, and shared UI primitives fit together before the API CRUD slices are wired in."
        eyebrow="Dashboard"
        title="Admin overview"
      />

      <DashboardOverview viewModel={viewModel} />
    </div>
  );
}

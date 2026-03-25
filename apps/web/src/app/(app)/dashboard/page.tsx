import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DashboardOverview } from "@/features/dashboard";
import { getDashboardViewModel } from "@/features/dashboard/server";

export default async function DashboardPage() {
  const viewModel = await getDashboardViewModel();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href="/clubs" variant="secondary">
              Browse clubs
            </Button>
            <Button href="/join/chess-society" variant="ghost">
              Preview join form
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

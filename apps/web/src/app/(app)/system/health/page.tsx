import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { HealthOverview } from "@/features/health";
import { getHealthCheck } from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const health = await getHealthCheck();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href="/dashboard" variant="secondary">
              Back to dashboard
            </Button>
            <Button href="/system/health" variant="ghost">
              Refresh
            </Button>
          </>
        }
        description="This preserves the current scaffold's API connectivity check while freeing the homepage to become the product-facing dashboard."
        eyebrow="Diagnostics"
        title="System health"
      />

      <HealthOverview health={health} refreshHref="/system/health" />
    </div>
  );
}

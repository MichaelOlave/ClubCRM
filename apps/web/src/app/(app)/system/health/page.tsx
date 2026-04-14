import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { HealthOverview } from "@/features/health";
import { getHealthCheck } from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  await requireOrgAdminBackendSession();
  const health = await getHealthCheck();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/system/health">Refresh</Link>
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

import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { HealthOverview, LiveRoutingPanel } from "@/features/health";
import { getHealthCheck, getLiveRoutingSnapshot } from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const [health, routingSnapshot] = await Promise.all([getHealthCheck(), getLiveRoutingSnapshot()]);

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
        description="This preserves the current scaffold's API connectivity check while adding a live routing view that can stay open in the networking demo iframe."
        eyebrow="Diagnostics"
        title="System health"
      />

      <HealthOverview health={health} refreshHref="/system/health" />
      <LiveRoutingPanel initialSnapshot={routingSnapshot} />
    </div>
  );
}

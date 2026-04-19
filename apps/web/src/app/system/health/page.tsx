import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { HealthOverview, LiveRoutingPanel, RedisDiagnosticsOverview } from "@/features/health";
import {
  getHealthCheck,
  getLiveRoutingSnapshot,
  getRedisDiagnosticsViewModel,
} from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const session = await requireOrgAdminBackendSession();
  const [health, routingSnapshot, redisDiagnostics] = await Promise.all([
    getHealthCheck(),
    getLiveRoutingSnapshot(),
    getRedisDiagnosticsViewModel(session),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/system/health">Refresh diagnostics</Link>
            </Button>
          </>
        }
        description="Operational checks for API connectivity, live routing, and Redis-backed dashboard caching."
        eyebrow="Diagnostics"
        title="System diagnostics"
      />

      <HealthOverview health={health} refreshHref="/system/health" />
      <LiveRoutingPanel initialSnapshot={routingSnapshot} />
      <RedisDiagnosticsOverview views={redisDiagnostics} />
    </div>
  );
}

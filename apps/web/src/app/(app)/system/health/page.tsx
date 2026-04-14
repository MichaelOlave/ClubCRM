import Link from "next/link";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { HealthOverview, RedisDiagnosticsOverview } from "@/features/health";
import { getHealthCheck, getRedisDiagnosticsViewModel } from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const session = await requireOrgAdminBackendSession();
  const [health, redisDiagnostics] = await Promise.all([
    getHealthCheck(),
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
        description="Operational checks for API connectivity and Redis-backed dashboard caching."
        eyebrow="Diagnostics"
        title="System diagnostics"
      />

      <HealthOverview health={health} refreshHref="/system/health" />
      <RedisDiagnosticsOverview views={redisDiagnostics} />
    </div>
  );
}

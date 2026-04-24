import Link from "next/link";
import { ArrowLeft, RefreshCw, Activity } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";
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
    <div className="space-y-12 pb-20">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link href="/system/health">
                <RefreshCw className="h-4 w-4" />
                Refresh all diagnostics
              </Link>
            </Button>
          </div>
        }
        description="Operational checks for API connectivity and Redis-backed dashboard caching."
        eyebrow="Diagnostics"
        title="System diagnostics"
      />

      <div className="space-y-16">
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Connectivity Status</span>
          </div>
          <HealthOverview health={health} refreshHref="/system/health" />
        </section>

        <Separator className="opacity-50" />

        <RedisDiagnosticsOverview views={redisDiagnostics} />
      </div>
    </div>
  );
}

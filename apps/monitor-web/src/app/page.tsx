import { MonitoringDashboardClient } from "@/features/monitoring/components/MonitoringDashboardClient";
import { getInitialMonitoringSnapshot } from "@/features/monitoring/server/getInitialMonitoringSnapshot";
import { getMonitorWebSocketUrl, resolveClubcrmDemoUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await getInitialMonitoringSnapshot();
  const streamUrl = getMonitorWebSocketUrl();
  const demoUrl = await resolveClubcrmDemoUrl();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 pt-4">
        <span className="monitor-label">Companion Monitoring Stack</span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              ClubCRM networking control plane
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Live telemetry, synthetic checks, cluster state, Longhorn storage health, and guarded
              failover controls for the dedicated networking demo environment.
            </p>
          </div>
          <div className="rounded-full border border-primary/35 bg-primary/12 px-4 py-2 text-sm font-medium text-primary">
            Separate from the main ClubCRM web and API apps
          </div>
        </div>
      </header>
      <MonitoringDashboardClient
        demoUrl={demoUrl}
        initialSnapshot={initialSnapshot}
        streamUrl={streamUrl}
      />
    </main>
  );
}

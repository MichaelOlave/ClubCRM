import { ClusterDashboard } from "@/features/cluster/components/ClusterDashboard";
import { getInitialClusterSnapshot } from "@/features/cluster/server/getInitialSnapshot";
import { getMonitorWebSocketUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await getInitialClusterSnapshot();
  const streamUrl = getMonitorWebSocketUrl();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-3 pt-2 sm:pt-4">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          ClubCRM cluster visualizer
        </span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Live Kubernetes cluster view
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              Watches the k3s cluster from outside and streams every node and pod transition over a
              WebSocket. Pods move between nodes in real time as the scheduler reassigns them.
            </p>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200">
            Event-driven · no polling
          </div>
        </div>
      </header>
      <ClusterDashboard initialSnapshot={initialSnapshot} streamUrl={streamUrl} />
    </main>
  );
}

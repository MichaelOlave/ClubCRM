import { ClusterDashboard } from "@/features/cluster/components/ClusterDashboard";
import { getInitialClusterSnapshot } from "@/features/cluster/server/getInitialSnapshot";
import { getClusterReplaySession } from "@/features/cluster/server/getReplaySession";
import { getMonitorWebSocketUrl, isMonitorReplayModeEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const replaySession = isMonitorReplayModeEnabled() ? await getClusterReplaySession() : null;
  const initialSnapshot = replaySession?.initial_snapshot ?? (await getInitialClusterSnapshot());
  const streamUrl = replaySession ? "" : getMonitorWebSocketUrl();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 pt-4">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          ClubCRM cluster visualizer
        </span>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              {replaySession ? "Kubernetes cluster replay" : "Live Kubernetes cluster view"}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              {replaySession
                ? "Replays a captured cluster session for rehearsals, fallback demos, and post-run analysis."
                : "Watches the k3s cluster from outside and streams every node and pod transition over a WebSocket. Pods move between nodes in real time as the scheduler reassigns them."}
            </p>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              replaySession
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {replaySession ? "Recorded playback" : "Event-driven · no polling"}
          </div>
        </div>
      </header>
      <ClusterDashboard
        initialSnapshot={initialSnapshot}
        replaySession={replaySession}
        streamUrl={streamUrl}
      />
    </main>
  );
}

import { ClusterDashboard } from "@/features/cluster/components/ClusterDashboard";
import {
  getInitialClusterSnapshot,
  getInitialEventLog,
} from "@/features/cluster/server/getInitialSnapshot";
import { getClusterReplaySession } from "@/features/cluster/server/getReplaySession";
import { getMonitorWebSocketUrl, isMonitorReplayModeEnabled, getClubCrmDemoUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const replaySession = isMonitorReplayModeEnabled() ? await getClusterReplaySession() : null;
  const [initialSnapshot, initialEventLog] = await Promise.all([
    replaySession?.initial_snapshot ?? getInitialClusterSnapshot(),
    replaySession ? Promise.resolve([]) : getInitialEventLog(),
  ]);
  const streamUrl = replaySession ? "" : getMonitorWebSocketUrl();
  const demoUrl = getClubCrmDemoUrl();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-3 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            ClubCRM cluster visualizer
          </span>
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-200 transition-all hover:border-violet-500/50 hover:bg-violet-500/20 active:scale-95"
          >
            Launch Live Demo
            <svg
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
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
        initialEventLog={initialEventLog}
        replaySession={replaySession}
        streamUrl={streamUrl}
      />
    </main>
  );
}

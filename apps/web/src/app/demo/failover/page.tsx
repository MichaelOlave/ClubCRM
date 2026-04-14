import { LiveRoutingPanel } from "@/features/health";
import { getLiveRoutingSnapshot } from "@/features/health/server";

export const dynamic = "force-dynamic";

export default async function FailoverDemoPage() {
  const snapshot = await getLiveRoutingSnapshot();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,var(--app-gradient-start),var(--app-gradient-mid)_30%,var(--app-gradient-end)_72%)] px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[1.75rem] border border-border bg-card/85 px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
                Public demo route
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                ClubCRM failover monitor
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                This page is intended for the networking demo iframe. It stays public, polls the
                live app every two seconds, and shows the current browser entry pod plus the API
                upstream pod and node.
              </p>
            </div>
            <div className="rounded-full border border-success-border bg-success px-4 py-2 text-sm font-semibold text-success-foreground">
              No login required
            </div>
          </div>
        </section>

        <LiveRoutingPanel initialSnapshot={snapshot} />
      </div>
    </main>
  );
}

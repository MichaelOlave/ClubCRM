import { getHealthCheck, HealthStatusCard, HealthMetaCard } from "@/features/health";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealthCheck();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff7ed_38%,_#fff_72%)] px-6 py-16 text-zinc-950">
      <section className="w-full max-w-4xl rounded-[2rem] border border-amber-200/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur sm:p-12">
        <div className="flex flex-col gap-10">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-700">ClubCRM</p>
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                API connection status
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
                This page checks the backend health endpoint and shows whether the web app can
                currently reach the API.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <HealthStatusCard connected={health.connected} details={health.details} />
            <HealthMetaCard status={health.status} endpoint={health.endpoint} />
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

type HealthCheckResult = {
  connected: boolean;
  status: string;
  endpoint: string;
  details: string;
};

const API_BASE_URLS = [process.env.API_BASE_URL, "http://api:8000", "http://localhost:8000"].filter(
  (value): value is string => Boolean(value)
);

export const dynamic = "force-dynamic";

async function getHealthCheck(): Promise<HealthCheckResult> {
  for (const baseUrl of API_BASE_URLS) {
    const endpoint = `${baseUrl.replace(/\/$/, "")}/health`;

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          connected: false,
          status: "unhealthy",
          endpoint,
          details: `Health check returned HTTP ${response.status}.`,
        };
      }

      const payload = (await response.json()) as { status?: string };

      return {
        connected: payload.status === "ok",
        status: payload.status ?? "unknown",
        endpoint,
        details:
          payload.status === "ok"
            ? "API health check responded successfully."
            : "API responded, but the reported status was not ok.",
      };
    } catch {
      continue;
    }
  }

  return {
    connected: false,
    status: "offline",
    endpoint: API_BASE_URLS[0] ? `${API_BASE_URLS[0].replace(/\/$/, "")}/health` : "Unavailable",
    details: "Unable to reach the API health check from the web app.",
  };
}

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
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-3.5 w-3.5 rounded-full ${
                    health.connected ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
                  Current state
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <p className="text-3xl font-semibold sm:text-4xl">
                  {health.connected ? "Connected" : "Not connected"}
                </p>
                <p className="max-w-xl text-base leading-7 text-zinc-300">{health.details}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
                    Health check
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950">{health.status}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-500">Endpoint</p>
                  <p className="mt-1 break-all text-sm leading-6 text-zinc-700">
                    {health.endpoint}
                  </p>
                </div>
              </div>

              <Link
                className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
                href="/"
              >
                Refresh status
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

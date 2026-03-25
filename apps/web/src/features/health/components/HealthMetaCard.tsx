import Link from "next/link";

type Props = {
  status: string;
  endpoint: string;
  refreshHref?: string;
};

export function HealthMetaCard({ status, endpoint, refreshHref = "/system/health" }: Props) {
  return (
    <div className="flex flex-col justify-between rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
            Health check
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{status}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-500">Endpoint</p>
          <p className="mt-1 break-all text-sm leading-6 text-zinc-700">{endpoint}</p>
        </div>
      </div>

      <Link
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
        href={refreshHref}
      >
        Refresh status
      </Link>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/shadcn/button";

type Props = {
  status: string;
  endpoint: string;
  refreshHref?: string;
};

export function HealthMetaCard({ status, endpoint, refreshHref = "/system/health" }: Props) {
  return (
    <div className="flex flex-col justify-between rounded-[1.5rem] border border-brand-border bg-brand-surface p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand">Health check</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{status}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
          <p className="mt-1 break-all text-sm leading-6 text-foreground/80">{endpoint}</p>
        </div>
      </div>

      <Button asChild className="mt-8 w-fit" variant="secondary">
        <Link href={refreshHref}>Refresh status</Link>
      </Button>
    </div>
  );
}

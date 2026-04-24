import Link from "next/link";
import { Activity, Globe, RefreshCcw } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardHeader } from "@/components/shadcn/card";

type Props = {
  status: string;
  endpoint: string;
  refreshHref?: string;
};

export function HealthMetaCard({ status, endpoint, refreshHref = "/system/health" }: Props) {
  return (
    <Card className="flex flex-col rounded-[1.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand" />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand">Metadata</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6 pb-6 sm:pb-8">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">API Status</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{status}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span>Endpoint</span>
            </div>
            <p className="mt-2 break-all rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5 text-foreground/80">
              {endpoint}
            </p>
          </div>
        </div>

        <Button asChild className="w-full gap-2 shadow-sm" variant="secondary">
          <Link href={refreshHref}>
            <RefreshCcw className="h-4 w-4" />
            Refresh status
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

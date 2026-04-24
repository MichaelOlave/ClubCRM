import { CheckCircle2, AlertCircle, XCircle, Info, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import type { ProfileCheck, ProfileCheckStatus } from "@/features/profile/types";

type Props = {
  checks: ProfileCheck[];
};

function getCheckVariant(status: ProfileCheckStatus) {
  switch (status) {
    case "pass":
      return "success";
    case "warn":
      return "warning";
    case "fail":
      return "destructive";
    case "info":
      return "secondary";
  }
}

function getCheckIcon(status: ProfileCheckStatus) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-5 w-5 text-success-solid" />;
    case "warn":
      return <AlertCircle className="h-5 w-5 text-warning-solid" />;
    case "fail":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "info":
      return <Info className="h-5 w-5 text-info-solid" />;
  }
}

export function DebugSession({ checks }: Props) {
  return (
    <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">Auth and session checks</h3>
          <p className="text-sm text-muted-foreground">
            Validation of the protected route and backend session alignment.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {checks.map((check) => (
          <div
            className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-muted/30 p-5 transition-all hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            key={check.label}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 shrink-0">{getCheckIcon(check.status)}</div>
              <div className="space-y-1">
                <p className="text-[15px] font-bold text-foreground">{check.label}</p>
                <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground/80">
                  {check.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={getCheckVariant(check.status)} className="capitalize shrink-0">
                {check.status}
              </Badge>
              <p className="break-all text-sm font-bold text-foreground">{check.value}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

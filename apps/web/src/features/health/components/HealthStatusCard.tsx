import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/shadcn/card";
import { cn } from "@/lib/utils";

type Props = {
  connected: boolean;
  details: string;
};

export function HealthStatusCard({ connected, details }: Props) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-none bg-foreground text-background transition-all"
      )}
    >
      <CardContent className="p-6 sm:p-8 pt-6 sm:pt-8">
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle2 className="h-5 w-5 text-success-solid" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-70">Current state</p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <p className="text-4xl font-bold tracking-tight sm:text-5xl">
            {connected ? "Connected" : "Not connected"}
          </p>
          <p className="max-w-xl text-lg leading-relaxed opacity-80">{details}</p>
        </div>

        {/* Decorative background icon */}
        <div className="absolute -right-8 -bottom-8 opacity-5">
          {connected ? (
            <CheckCircle2 className="h-48 w-48" />
          ) : (
            <AlertCircle className="h-48 w-48" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

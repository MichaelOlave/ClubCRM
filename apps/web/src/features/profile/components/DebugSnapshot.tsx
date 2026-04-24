import { Code2 } from "lucide-react";

import { Card } from "@/components/shadcn/card";

type Props = {
  snapshot: string;
};

export function DebugSnapshot({ snapshot }: Props) {
  return (
    <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-100">
          <Code2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">Debug snapshot</h3>
          <p className="text-sm text-muted-foreground">
            Masked raw data from the current request and backend response.
          </p>
        </div>
      </div>

      <div className="relative mt-8">
        <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          JSON
        </div>
        <pre className="overflow-x-auto rounded-[1.25rem] border border-slate-800 bg-slate-950 p-6 text-[13px] leading-relaxed text-slate-300 shadow-2xl">
          <code className="block">{snapshot}</code>
        </pre>
      </div>
    </Card>
  );
}

import { Server, Globe, Key } from "lucide-react";

import { Card } from "@/components/shadcn/card";
import type { ProfileField } from "@/features/profile/types";

type Props = {
  fields: ProfileField[];
};

function getContextIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("endpoint") || l.includes("host") || l.includes("proto"))
    return <Server className="h-4 w-4" />;
  if (l.includes("url") || l.includes("target")) return <Globe className="h-4 w-4" />;
  if (l.includes("cookie") || l.includes("header") || l.includes("csrf"))
    return <Key className="h-4 w-4" />;
  return null;
}

export function DebugContext({ fields }: Props) {
  return (
    <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Request context</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Web-side request and environment details influencing the auth flow.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div
            className="group flex flex-col rounded-[1.25rem] border border-border bg-muted/20 p-5 transition-colors hover:bg-muted/40 shadow-sm"
            key={field.label}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
              {getContextIcon(field.label)}
              {field.label}
            </div>
            <p
              className={`mt-3 whitespace-pre-wrap break-all text-[13px] leading-relaxed text-foreground ${
                field.isCode
                  ? "font-mono bg-muted/50 p-2 rounded-lg border border-border/50"
                  : "font-semibold"
              }`}
            >
              {field.value}
            </p>
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
              {field.helperText}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

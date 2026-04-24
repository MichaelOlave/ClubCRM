import { Shield, MapPin, Hash, UserCircle, CheckCircle2, XCircle } from "lucide-react";

import { Card } from "@/components/shadcn/card";
import type { ProfileField } from "@/features/profile/types";

type Props = {
  fields: ProfileField[];
};

function getFieldIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("role")) return <Shield className="h-4 w-4" />;
  if (l.includes("id") || l.includes("subject")) return <Hash className="h-4 w-4" />;
  if (l.includes("club")) return <MapPin className="h-4 w-4" />;
  if (l.includes("name") || l.includes("identity")) return <UserCircle className="h-4 w-4" />;
  if (l.includes("verified")) return null; // Handled specially
  return null;
}

export function ProfileDetails({ fields }: Props) {
  return (
    <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Stored personal info</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          These fields mirror the user payload currently stored in the backend auth session.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const isVerified = field.label.toLowerCase().includes("verified");
          const verifiedValue = field.value.toLowerCase() === "yes" || field.value === "true";

          return (
            <div
              className="flex flex-col rounded-[1.25rem] border border-border bg-muted/30 p-5 transition-colors hover:bg-muted/50 shadow-sm"
              key={field.label}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground/80">
                {getFieldIcon(field.label)}
                {field.label}
              </div>
              <div className="mt-3 flex items-center gap-3">
                {isVerified &&
                  (verifiedValue ? (
                    <CheckCircle2 className="h-5 w-5 text-success-solid" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ))}
                <p
                  className={`whitespace-pre-wrap break-all text-[15px] leading-relaxed text-foreground ${
                    field.isCode
                      ? "font-mono text-sm bg-muted/60 px-1.5 py-0.5 rounded"
                      : "font-semibold"
                  }`}
                >
                  {field.value}
                </p>
              </div>
              <p className="mt-2.5 text-[13px] leading-5 text-muted-foreground/70">
                {field.helperText}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

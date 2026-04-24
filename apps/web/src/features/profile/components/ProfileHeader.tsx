import { User, Mail } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import type { ProfileSummary } from "@/features/profile/types";

type Props = {
  summary: ProfileSummary;
};

export function ProfileHeader({ summary }: Props) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border p-0 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="h-32 bg-gradient-to-r from-brand/20 via-brand/10 to-background" />
      <div className="px-6 pb-8 sm:px-8">
        <div className="relative -mt-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border-4 border-background bg-brand text-2xl font-semibold text-brand-foreground shadow-sm sm:h-32 sm:w-32">
              {summary.initials}
            </div>

            <div className="min-w-0 space-y-1 pb-1">
              <div className="flex items-center gap-2">
                <h2 className="break-words text-2xl font-bold text-foreground sm:text-3xl">
                  {summary.name}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <p className="break-all text-sm font-medium">{summary.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {summary.badges.map((badge) => (
              <Badge key={badge.label} variant={badge.tone} className="rounded-full px-3 py-1">
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <div className="flex items-start gap-3 text-muted-foreground">
            <User className="mt-1 h-4 w-4 shrink-0 text-brand" />
            <p className="max-w-4xl text-sm leading-6">{summary.subtitle}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

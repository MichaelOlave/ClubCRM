import type { ReactNode } from "react";

import { Badge } from "@/components/shadcn/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";

type ControlSection = {
  content: ReactNode;
  description: string;
  label: string;
};

type Props = {
  footer?: ReactNode;
  sections: ControlSection[];
};

export function ClubControlPanel({ footer, sections }: Props) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <CardHeader className="space-y-3 border-b border-border/70 bg-muted/20 p-5">
        <Badge className="w-fit" variant="muted">
          Club controls
        </Badge>
        <div className="space-y-1">
          <CardTitle className="text-lg">Persistent actions</CardTitle>
          <CardDescription>
            Editing, publishing, and roster controls stay visible in the club header.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {sections.map((section) => (
          <section
            className="space-y-3 rounded-[1.25rem] border border-border/70 bg-background p-4"
            key={section.label}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {section.label}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{section.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">{section.content}</div>
          </section>
        ))}

        {footer ? <div className="border-t border-border/70 pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

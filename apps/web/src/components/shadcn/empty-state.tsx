import type { ReactNode } from "react";

import { Card } from "./card";

type Props = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: Props) {
  return (
    <Card className="rounded-[1.5rem] border-dashed p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}

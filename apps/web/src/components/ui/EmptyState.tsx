import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type Props = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: Props) {
  return (
    <Card className="border-dashed text-center">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-semibold text-zinc-950">{title}</h3>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}

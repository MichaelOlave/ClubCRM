import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

type Props = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  open?: boolean;
  title: string;
};

export function Dialog({ actions, children, className, description, open = false, title }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <Card className={cn("w-full max-w-xl", className)}>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
            {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
          </div>
          <div>{children}</div>
          {actions ? <div className="flex justify-end gap-3">{actions}</div> : null}
        </div>
      </Card>
    </div>
  );
}

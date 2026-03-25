import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { ToastTone } from "@/types/ui";

type Props = {
  children: ReactNode;
  className?: string;
  tone?: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function Toast({ children, className, tone = "info" }: Props) {
  return (
    <div
      className={cn("rounded-3xl border px-4 py-3 text-sm leading-6", toneClasses[tone], className)}
    >
      {children}
    </div>
  );
}

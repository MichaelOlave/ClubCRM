import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-900 text-white",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
  muted: "bg-zinc-100 text-zinc-600",
};

export function Badge({ children, className, variant = "default" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

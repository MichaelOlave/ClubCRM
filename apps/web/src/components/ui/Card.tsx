import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type CardTone = "default" | "subtle" | "inverse";

type Props = {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
};

const toneClasses: Record<CardTone, string> = {
  default: "border-zinc-200 bg-white text-zinc-950",
  subtle: "border-amber-200 bg-amber-50 text-zinc-950",
  inverse: "border-zinc-800 bg-zinc-950 text-white",
};

export function Card({ children, className, tone = "default" }: Props) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </section>
  );
}

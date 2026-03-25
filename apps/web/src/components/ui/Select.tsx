import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
};

export function Select({ children, className, error, hint, id, label, ...props }: Props) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800" htmlFor={selectId}>
      <span>{label}</span>
      <select
        className={cn(
          "h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200",
          error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
          className
        )}
        id={selectId}
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
    </label>
  );
}

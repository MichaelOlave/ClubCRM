import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  label: string;
};

export function Input({ className, error, hint, id, label, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800" htmlFor={inputId}>
      <span>{label}</span>
      <input
        className={cn(
          "h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200",
          error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
          className
        )}
        id={inputId}
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
    </label>
  );
}

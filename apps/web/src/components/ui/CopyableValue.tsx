"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function CopyableValue({ value, className, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={handleCopy}
      type="button"
    >
      <div className="flex-1 min-w-0">{children}</div>
      <div className="mt-0.5 shrink-0 text-muted-foreground transition-opacity group-hover:opacity-100 sm:opacity-0">
        {copied ? (
          <Check className="h-4 w-4 text-brand" />
        ) : (
          <Copy className="h-4 w-4 opacity-50 group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

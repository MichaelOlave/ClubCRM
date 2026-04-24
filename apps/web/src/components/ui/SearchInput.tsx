"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/utils";

type Props = {
  placeholder?: string;
  className?: string;
};

export function SearchInput({ placeholder = "Search...", className }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(currentQ);

  // Sync state with URL when it changes externally
  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  // Debounce search navigation
  useEffect(() => {
    if (value === currentQ) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      params.delete("page");

      startTransition(() => {
        replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, currentQ, pathname, replace, searchParams]);

  return (
    <div className={cn("relative flex flex-1 flex-shrink-0", className)}>
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground peer-focus:text-foreground" />
      <Input
        className="peer block w-full rounded-[1.25rem] border border-border bg-background py-[9px] pl-10 text-sm outline-2 placeholder:text-muted-foreground focus-visible:ring-brand/20"
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        value={value}
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-muted"
          type="button"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {isPending && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}
    </div>
  );
}

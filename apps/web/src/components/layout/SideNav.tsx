"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { useActivePath } from "@/hooks/useActivePath";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/types/ui";

type Props = {
  items: NavItem[];
};

export function SideNav({ items }: Props) {
  const isActivePath = useActivePath();

  return (
    <aside className="w-full shrink-0 lg:max-w-72">
      <div className="sticky top-4 rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-4">
          <div className="space-y-2">
            <Badge variant="warning">Admin MVP</Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-amber-200 bg-amber-50 shadow-sm">
                <Image
                  alt="ClubCRM logo"
                  className="h-10 w-10 scale-110 rounded-lg"
                  height={40}
                  priority
                  src="/favicon.ico"
                  width={40}
                />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
                  ClubCRM
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Workspace</h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-zinc-600">
              Lightweight route groups, feature folders, and reusable primitives for the first admin
              flows.
            </p>
          </div>

          <nav aria-label="Primary" className="space-y-2">
            {items.map((item) => {
              const active = isActivePath(item.href);

              return (
                <Link
                  className={cn(
                    "block rounded-[1.25rem] border px-4 py-3 transition",
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-transparent bg-zinc-50 text-zinc-700 hover:border-zinc-200 hover:bg-white"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-sm leading-5",
                      active ? "text-zinc-300" : "text-zinc-500"
                    )}
                  >
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  LayoutDashboard,
  ShieldCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/types/ui";

const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "user-circle": UserCircle,
  calendar: Calendar,
  users: Users,
  "shield-check": ShieldCheck,
  activity: Activity,
};

type Props = {
  items: NavItem[];
  className?: string;
};

export function SideNav({ items, className }: Props) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex w-full flex-col lg:w-72", className)}>
      <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-sm">
                <Image
                  alt="ClubCRM logo"
                  className="h-8 w-8 rounded-lg"
                  height={32}
                  priority
                  src="/favicon.ico"
                  width={32}
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">ClubCRM</p>
                <h1 className="text-lg font-semibold text-foreground">Workspace</h1>
              </div>
            </div>
            <Badge className="w-fit" variant="warning">
              Admin MVP
            </Badge>
          </div>

          <nav aria-label="Primary" className="space-y-1">
            {items.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon ? ICON_MAP[item.icon] : null;

              return (
                <Link
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-background shadow-sm"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        active
                          ? "text-background"
                          : "text-foreground/60 group-hover:text-foreground"
                      )}
                    />
                  )}
                  <span className={cn(active ? "text-background" : "")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-semibold text-foreground">Need help?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check our documentation or contact support.
            </p>
            <Link
              href="/docs"
              className="mt-3 block text-xs font-medium text-brand hover:underline"
            >
              Documentation &rarr;
            </Link>
            <Link
              href="/system/health"
              className="mt-3 block text-xs font-medium text-brand hover:underline"
            >
              System Health &rarr;
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

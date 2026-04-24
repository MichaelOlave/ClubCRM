"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/shadcn/sheet";
import { SideNav } from "./SideNav";
import type { NavItem } from "@/types/ui";

type Props = {
  logoutAction: () => Promise<void>;
  subtitle: string;
  title: string;
  navItems: NavItem[];
};

export function TopBar({ logoutAction, subtitle, title, navItems }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex flex-col gap-3 rounded-[1.25rem] border border-border bg-card/80 px-4 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.75rem] sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-80 p-0 border-none bg-transparent">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Access workspace navigation</SheetDescription>
              </SheetHeader>
              <SideNav items={navItems} className="h-full p-2 sm:p-4" />
            </SheetContent>
          </Sheet>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand/80 sm:text-[10px]">
              {subtitle}
            </p>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
          </div>
        </div>

        <div className="sm:hidden">{mounted ? <ModeToggle /> : <div className="h-9 w-9" />}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          {mounted ? <ModeToggle /> : <div className="h-9 w-9" />}
        </div>
        <Badge className="hidden px-3 py-1 lg:inline-flex" variant="success">
          Live Backend
        </Badge>
        <form action={logoutAction} className="w-full sm:w-auto">
          <Button
            size="sm"
            type="submit"
            variant="outline"
            className="h-9 w-full rounded-xl px-4 sm:w-auto"
          >
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}

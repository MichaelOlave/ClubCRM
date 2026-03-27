import type { ReactNode } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
import type { NavItem } from "@/types/ui";

type Props = {
  children: ReactNode;
  navItems: NavItem[];
  subtitle: string;
  title: string;
};

export function AppShell({ children, navItems, subtitle, title }: Props) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,var(--app-gradient-start),var(--app-gradient-mid)_38%,var(--app-gradient-end)_72%)] px-4 py-4 text-foreground lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6 lg:flex-row">
        <SideNav items={navItems} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <TopBar subtitle={subtitle} title={title} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

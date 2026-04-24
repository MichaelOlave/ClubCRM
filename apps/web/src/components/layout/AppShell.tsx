import type { ReactNode } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
import type { NavItem } from "@/types/ui";

type Props = {
  children: ReactNode;
  logoutAction: () => Promise<void>;
  navItems: NavItem[];
  subtitle: string;
  title: string;
};

export function AppShell({ children, logoutAction, navItems, subtitle, title }: Props) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,var(--app-gradient-start),var(--app-gradient-mid)_38%,var(--app-gradient-end)_72%)] px-4 py-4 text-foreground lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:flex-row lg:gap-8">
        <SideNav items={navItems} className="hidden lg:flex" />

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <TopBar
            logoutAction={logoutAction}
            subtitle={subtitle}
            title={title}
            navItems={navItems}
          />
          <main className="flex-1">
            <div className="h-full rounded-[2rem] border border-border bg-card/40 p-1 shadow-[0_8px_32px_rgba(15,23,42,0.04)] backdrop-blur-[2px]">
              <div className="h-full rounded-[1.75rem] bg-background/60 p-6 lg:p-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

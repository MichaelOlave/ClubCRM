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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,var(--app-gradient-start),var(--app-gradient-mid)_38%,var(--app-gradient-end)_72%)] px-2 py-2 text-foreground sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-7xl flex-col gap-3 sm:min-h-[calc(100vh-2rem)] sm:gap-4 lg:flex-row lg:gap-8">
        <SideNav items={navItems} className="hidden lg:flex" />

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4 lg:gap-6">
          <TopBar
            logoutAction={logoutAction}
            subtitle={subtitle}
            title={title}
            navItems={navItems}
          />
          <main className="flex-1">
            <div className="h-full rounded-[1.5rem] border border-border bg-card/40 p-0.5 shadow-[0_8px_32px_rgba(15,23,42,0.04)] backdrop-blur-[2px] sm:rounded-[2rem] sm:p-1">
              <div className="h-full rounded-[1.25rem] bg-background/60 p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

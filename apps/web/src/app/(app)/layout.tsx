import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/types/ui";

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, quick actions, and recent system activity.",
  },
  {
    href: "/clubs",
    label: "Clubs",
    description: "Club directory plus embedded event and announcement detail.",
  },
  {
    href: "/members",
    label: "Members",
    description: "Organization-level member records and shared memberships.",
  },
  {
    href: "/system/health",
    label: "Diagnostics",
    description: "Preserved API connectivity surface for the current scaffold.",
  },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell navItems={navItems} subtitle="Champlain College" title="Club management admin">
      {children}
    </AppShell>
  );
}

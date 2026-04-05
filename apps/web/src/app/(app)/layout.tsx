import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { logout } from "@/features/auth/server/actions";
import { getBackendAuthSession } from "@/features/auth/server/authApi";
import type { NavItem } from "@/types/ui";

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, quick actions, and recent system activity.",
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Stored auth identity plus session and cookie diagnostics.",
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

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionResult = await getBackendAuthSession();

  if (sessionResult.status !== "available" || !sessionResult.session.authenticated) {
    redirect("/login");
  }

  return (
    <AppShell
      logoutAction={logout}
      navItems={navItems}
      subtitle="Champlain College"
      title="Club management admin"
    >
      {children}
    </AppShell>
  );
}

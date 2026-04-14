import { AppShell } from "@/components/layout/AppShell";
import { logout } from "@/features/auth/server/actions";
import {
  isOrgAdminBackendAuthSession,
  requireAuthorizedBackendSession,
} from "@/features/auth/server";
import type { NavItem } from "@/types/ui";

const orgAdminNavItems: NavItem[] = [
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
    href: "/system/audit",
    label: "Audit log",
    description: "Admin write history with actor, request path, and resource details.",
  },
  {
    href: "/system/health",
    label: "Diagnostics",
    description: "Preserved API connectivity surface for the current scaffold.",
  },
];

const clubManagerNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, quick actions, and recent activity for your assigned clubs.",
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Stored auth identity plus session and access diagnostics.",
  },
  {
    href: "/clubs",
    label: "Clubs",
    description: "Assigned clubs, rosters, join requests, and club-owned activity.",
  },
];

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const navItems = isOrgAdmin ? orgAdminNavItems : clubManagerNavItems;
  const title = isOrgAdmin ? "Organization admin" : "Club manager workspace";
  const subtitle = isOrgAdmin ? "Champlain College" : "Assigned clubs only";

  return (
    <AppShell logoutAction={logout} navItems={navItems} subtitle={subtitle} title={title}>
      {children}
    </AppShell>
  );
}

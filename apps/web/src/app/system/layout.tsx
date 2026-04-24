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
    icon: "layout-dashboard",
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Stored auth identity plus session and cookie diagnostics.",
    icon: "user-circle",
  },
  {
    href: "/clubs",
    label: "Clubs",
    description: "Club directory plus embedded event and announcement detail.",
    icon: "calendar",
  },
  {
    href: "/members",
    label: "Members",
    description: "Organization-level member records and shared memberships.",
    icon: "users",
  },
  {
    href: "/system/audit",
    label: "Audit log",
    description: "Admin write history with actor, request path, and resource details.",
    icon: "shield-check",
  },
  {
    href: "/system/health",
    label: "Diagnostics",
    description: "Preserved API connectivity surface for the current scaffold.",
    icon: "activity",
  },
];

const clubManagerNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview, quick actions, and recent activity for your assigned clubs.",
    icon: "layout-dashboard",
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Stored auth identity plus session and access diagnostics.",
    icon: "user-circle",
  },
  {
    href: "/clubs",
    label: "Clubs",
    description: "Assigned clubs, rosters, join requests, and club-owned activity.",
    icon: "calendar",
  },
];

export const dynamic = "force-dynamic";

export default async function SystemLayout({
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

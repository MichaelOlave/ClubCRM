import { PageHeader } from "@/components/layout/PageHeader";
import {
  isOrgAdminBackendAuthSession,
  requireAuthorizedBackendSession,
} from "@/features/auth/server";
import { DashboardOverview } from "@/features/dashboard";
import { getDashboardViewModel } from "@/features/dashboard/server";

export default async function DashboardPage() {
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const viewModel = await getDashboardViewModel(session);

  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-lg">
              {firstName[0].toUpperCase()}
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Welcome back, {firstName}
            </p>
          </div>
          <PageHeader
            description={
              isOrgAdmin
                ? "A live overview of clubs, members, and upcoming activity across the current ClubCRM organization."
                : "A focused view of the clubs you manage, with live roster and activity data from the backend."
            }
            eyebrow="Dashboard"
            title={isOrgAdmin ? "Organization overview" : "Club manager overview"}
          />
        </div>
      </div>

      <DashboardOverview viewModel={viewModel} />
    </div>
  );
}

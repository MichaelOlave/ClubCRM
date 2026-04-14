import Link from "next/link";

import { Button } from "@/components/shadcn/button";
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
  const previewJoinHref =
    viewModel.quickActions.find((action) => action.href.startsWith("/join/"))?.href ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/clubs">Browse clubs</Link>
            </Button>
            {previewJoinHref ? (
              <Button asChild variant="ghost">
                <Link href={previewJoinHref}>Preview join form</Link>
              </Button>
            ) : null}
          </>
        }
        description={
          isOrgAdmin
            ? "This organization-level overview renders live backend data and includes Redis-backed dashboard cache analytics across your club activity."
            : "This role-aware overview focuses on your assigned clubs and includes Redis-backed dashboard cache signals for the summaries you can access."
        }
        eyebrow="Dashboard"
        title={isOrgAdmin ? "Organization overview" : "Club manager overview"}
      />

      <DashboardOverview viewModel={viewModel} />
    </div>
  );
}

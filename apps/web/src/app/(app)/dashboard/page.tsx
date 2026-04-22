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
  const previewJoinHref = viewModel.joinPreviewHref;

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
            ? "A live overview of clubs, members, and upcoming activity across the current ClubCRM organization."
            : "A focused view of the clubs you manage, with live roster and activity data from the backend."
        }
        eyebrow="Dashboard"
        title={isOrgAdmin ? "Organization overview" : "Club manager overview"}
      />

      <DashboardOverview viewModel={viewModel} />
    </div>
  );
}

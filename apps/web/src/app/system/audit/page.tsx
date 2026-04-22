import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { AuditLogOverview } from "@/features/audit";
import { getAuditLogViewModel } from "@/features/audit/server";

type Props = {
  searchParams: Promise<{
    action?: string | string[];
    actorQuery?: string | string[];
    from?: string | string[];
    limit?: string | string[];
    page?: string | string[];
    resourceId?: string | string[];
    resourceType?: string | string[];
    to?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function SystemAuditPage({ searchParams }: Props) {
  await requireOrgAdminBackendSession();
  const viewModel = await getAuditLogViewModel(await searchParams);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        }
        description="Review the admin-side record of who changed what, where the request came from, and when it happened."
        eyebrow="Audit"
        title="Admin audit log"
      />

      <AuditLogOverview viewModel={viewModel} />
    </div>
  );
}

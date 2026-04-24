import Link from "next/link";
import { RotateCw, LayoutGrid } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import {
  isOrgAdminBackendAuthSession,
  requireAuthorizedBackendSession,
} from "@/features/auth/server";
import { ProfileOverview } from "@/features/profile";
import { getProfileViewModel } from "@/features/profile/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const viewModel = await getProfileViewModel(session);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-full shadow-sm">
              <Link href="/profile" className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Refresh
              </Link>
            </Button>
            {!isOrgAdmin && (
              <Button asChild variant="secondary" size="sm" className="rounded-full shadow-sm">
                <Link href="/clubs" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-brand" />
                  My Clubs
                </Link>
              </Button>
            )}
          </div>
        }
        description="View and manage your identity, access grants, and session security details."
        eyebrow="My Account"
        title="Account Profile"
      />

      <ProfileOverview viewModel={viewModel} />
    </div>
  );
}

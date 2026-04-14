import Link from "next/link";

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
          <>
            <Button asChild variant="secondary">
              <Link href="/profile">Refresh profile</Link>
            </Button>
            {isOrgAdmin ? (
              <Button asChild variant="ghost">
                <Link href="/system/health">Open system health</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/clubs">Open clubs</Link>
              </Button>
            )}
          </>
        }
        description="This profile route shows the personal identity, ClubCRM access grant, and auth/session diagnostics currently attached to the signed-in backend session."
        eyebrow="Auth profile"
        title="My profile"
      />

      <ProfileOverview viewModel={viewModel} />
    </div>
  );
}

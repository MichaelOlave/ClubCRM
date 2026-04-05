import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import { ProfileOverview } from "@/features/profile";
import { getProfileViewModel } from "@/features/profile/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewModel = await getProfileViewModel();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/profile">Refresh profile</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/system/health">Open system health</Link>
            </Button>
          </>
        }
        description="This profile route shows the personal fields the backend currently stores for the signed-in user and the auth/session diagnostics we need while the broader member profile contract is still taking shape."
        eyebrow="Auth profile"
        title="My profile"
      />

      <ProfileOverview viewModel={viewModel} />
    </div>
  );
}

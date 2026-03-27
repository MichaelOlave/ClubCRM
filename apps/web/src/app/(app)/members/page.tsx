import Link from "next/link";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberDirectory } from "@/features/members";
import { getMemberList } from "@/features/members/server";

export default async function MembersPage() {
  const members = await getMemberList();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/clubs">View clubs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        }
        description="Members are modeled at the organization level, so this directory stays outside any single club and links back into shared membership detail."
        eyebrow="Members"
        title="Member directory"
      />

      <Alert variant="info">
        <AlertDescription>
          This route is where create-member and assign-to-club drawers can plug in later without
          changing the page structure.
        </AlertDescription>
      </Alert>

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Organization members</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Shared records prevent duplicate member entries when someone belongs to more than one
            club.
          </p>
        </div>
        <MemberDirectory members={members} />
      </Card>
    </div>
  );
}

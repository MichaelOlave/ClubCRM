import Link from "next/link";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getClubList } from "@/features/clubs/server";
import { CreateMemberDialog, MemberDirectory } from "@/features/members";
import { createMemberAction, getMemberList } from "@/features/members/server";
import { getActionNotice } from "@/lib/forms";

type Props = {
  searchParams: Promise<{
    memberCreated?: string | string[];
    memberError?: string | string[];
  }>;
};

export default async function MembersPage({ searchParams }: Props) {
  const [members, clubs, query] = await Promise.all([getMemberList(), getClubList(), searchParams]);
  const memberNotice = getActionNotice(query.memberCreated, query.memberError);
  const defaultOrganizationId = members[0]?.organizationId ?? clubs[0]?.organizationId ?? "";
  const memberSuccessNotice = memberNotice?.kind === "success" ? memberNotice : null;
  const memberErrorNotice = memberNotice?.kind === "error" ? memberNotice : null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <CreateMemberDialog
              action={createMemberAction}
              defaultOrganizationId={defaultOrganizationId}
              notice={memberErrorNotice}
            />
            <Button asChild variant="secondary">
              <Link href="/clubs">View clubs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </>
        }
        description="Create organization-level member records here once, then assign those same members into clubs from the club detail workflow."
        eyebrow="Members"
        title="Member directory"
      />

      <Alert variant="info">
        <AlertDescription>
          Create members here first, then open a club detail page to add them to the roster.
        </AlertDescription>
      </Alert>

      <ActionNotice notice={memberSuccessNotice} />

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

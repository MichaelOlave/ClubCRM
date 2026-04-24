import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { DeleteMemberDialog, EditMemberDialog, MemberProfile } from "@/features/members";
import { deleteMemberAction, getMemberDetail, updateMemberAction } from "@/features/members/server";
import { updateMembershipStatusAction } from "@/features/memberships/server";
import { getActionNotice } from "@/lib/forms";

type Props = {
  params: Promise<{
    memberId: string;
  }>;
  searchParams: Promise<{
    memberDeleteError?: string | string[];
    memberUpdated?: string | string[];
    memberUpdateError?: string | string[];
    membershipStatusUpdated?: string | string[];
    membershipStatusError?: string | string[];
  }>;
};

export default async function MemberDetailPage({ params, searchParams }: Props) {
  await requireOrgAdminBackendSession();
  const { memberId } = await params;
  const [detail, query] = await Promise.all([getMemberDetail(memberId), searchParams]);

  if (!detail) {
    notFound();
  }

  const memberUpdateNotice = getActionNotice(query.memberUpdated, query.memberUpdateError);
  const memberUpdateSuccessNotice =
    memberUpdateNotice?.kind === "success" ? memberUpdateNotice : null;
  const memberUpdateErrorNotice = memberUpdateNotice?.kind === "error" ? memberUpdateNotice : null;
  const membershipStatusNotice = getActionNotice(
    query.membershipStatusUpdated,
    query.membershipStatusError
  );
  const membershipStatusSuccessNotice =
    membershipStatusNotice?.kind === "success" ? membershipStatusNotice : null;
  const membershipStatusErrorNotice =
    membershipStatusNotice?.kind === "error" ? membershipStatusNotice : null;
  const memberDeleteNotice = getActionNotice(undefined, query.memberDeleteError);
  const memberDeleteErrorNotice = memberDeleteNotice?.kind === "error" ? memberDeleteNotice : null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <EditMemberDialog
              action={updateMemberAction}
              member={detail.member}
              notice={memberUpdateErrorNotice}
            />
            <DeleteMemberDialog
              action={deleteMemberAction}
              member={detail.member}
              notice={memberDeleteErrorNotice}
            />
            <Button asChild variant="secondary">
              <Link href="/members">Back to members</Link>
            </Button>
            {detail.memberships[0] ? (
              <Button asChild variant="ghost">
                <Link href={`/clubs/${detail.memberships[0].clubId}`}>Open primary club</Link>
              </Button>
            ) : null}
          </>
        }
        description="Member detail keeps organization-wide identity, backend record metadata, and club assignments together so we can reuse the same record across multiple workflows."
        eyebrow="Member detail"
        title={`${detail.member.firstName} ${detail.member.lastName}`}
      />

      <ActionNotice notice={memberUpdateSuccessNotice} />
      <ActionNotice notice={membershipStatusSuccessNotice} />
      <ActionNotice notice={membershipStatusErrorNotice} />

      <MemberProfile detail={detail} membershipStatusAction={updateMembershipStatusAction} />
    </div>
  );
}

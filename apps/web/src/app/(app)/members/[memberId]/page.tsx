import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditMemberDialog, MemberProfile } from "@/features/members";
import { getMemberDetail, updateMemberAction } from "@/features/members/server";
import { getMembershipsForMember } from "@/features/memberships/server";
import { getActionNotice } from "@/lib/forms";

type Props = {
  params: Promise<{
    memberId: string;
  }>;
  searchParams: Promise<{
    memberUpdated?: string | string[];
    memberUpdateError?: string | string[];
  }>;
};

export default async function MemberDetailPage({ params, searchParams }: Props) {
  const { memberId } = await params;
  const [detail, memberships, query] = await Promise.all([
    getMemberDetail(memberId),
    getMembershipsForMember(memberId),
    searchParams,
  ]);

  if (!detail) {
    notFound();
  }

  const memberUpdateNotice = getActionNotice(query.memberUpdated, query.memberUpdateError);
  const memberUpdateSuccessNotice =
    memberUpdateNotice?.kind === "success" ? memberUpdateNotice : null;
  const memberUpdateErrorNotice = memberUpdateNotice?.kind === "error" ? memberUpdateNotice : null;

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
            <Button asChild variant="secondary">
              <Link href="/members">Back to members</Link>
            </Button>
            {memberships[0] ? (
              <Button asChild variant="ghost">
                <Link href={`/clubs/${memberships[0].clubId}`}>Open primary club</Link>
              </Button>
            ) : null}
          </>
        }
        description="Member detail keeps organization-wide identity, backend record metadata, and club assignments together so we can reuse the same record across multiple workflows."
        eyebrow="Member detail"
        title={`${detail.member.firstName} ${detail.member.lastName}`}
      />

      <ActionNotice notice={memberUpdateSuccessNotice} />

      <MemberProfile detail={detail} memberships={memberships} />
    </div>
  );
}

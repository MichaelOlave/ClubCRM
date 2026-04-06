import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClubProfile, EditClubDialog } from "@/features/clubs";
import { getClubDetail, updateClubAction } from "@/features/clubs/server";
import { AddMemberToClubDialog, EditMembershipRoleDialog } from "@/features/memberships";
import {
  createMembershipAction,
  getAssignableMembersForClub,
  getMembershipsForClub,
  updateMembershipRoleAction,
} from "@/features/memberships/server";
import { getActionNotice } from "@/lib/forms";

type Props = {
  params: Promise<{
    clubId: string;
  }>;
  searchParams: Promise<{
    clubUpdated?: string | string[];
    clubUpdateError?: string | string[];
    membershipCreated?: string | string[];
    membershipError?: string | string[];
    membershipUpdated?: string | string[];
    membershipUpdateError?: string | string[];
    membershipUpdateTarget?: string | string[];
  }>;
};

export default async function ClubDetailPage({ params, searchParams }: Props) {
  const { clubId } = await params;
  const [detail, memberships, assignableMembers, query] = await Promise.all([
    getClubDetail(clubId),
    getMembershipsForClub(clubId),
    getAssignableMembersForClub(clubId),
    searchParams,
  ]);

  if (!detail) {
    notFound();
  }

  const assignmentNotice = getActionNotice(query.membershipCreated, query.membershipError);
  const clubUpdateNotice = getActionNotice(query.clubUpdated, query.clubUpdateError);
  const membershipUpdateNotice = getActionNotice(
    query.membershipUpdated,
    query.membershipUpdateError
  );
  const membershipUpdateTarget = Array.isArray(query.membershipUpdateTarget)
    ? query.membershipUpdateTarget[0]
    : query.membershipUpdateTarget;
  const assignmentSuccessNotice = assignmentNotice?.kind === "success" ? assignmentNotice : null;
  const assignmentErrorNotice = assignmentNotice?.kind === "error" ? assignmentNotice : null;
  const clubUpdateSuccessNotice = clubUpdateNotice?.kind === "success" ? clubUpdateNotice : null;
  const clubUpdateErrorNotice = clubUpdateNotice?.kind === "error" ? clubUpdateNotice : null;
  const membershipUpdateSuccessNotice =
    membershipUpdateNotice?.kind === "success" ? membershipUpdateNotice : null;
  const membershipUpdateErrorNotice =
    membershipUpdateNotice?.kind === "error" ? membershipUpdateNotice : null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <EditClubDialog
              action={updateClubAction}
              club={detail.club}
              notice={clubUpdateErrorNotice}
            />
            <AddMemberToClubDialog
              action={createMembershipAction}
              clubId={detail.club.id}
              members={assignableMembers}
              notice={assignmentErrorNotice}
            />
            <Button asChild variant="secondary">
              <Link href={`/join/${clubId}`}>Open public form</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/clubs">Back to clubs</Link>
            </Button>
          </>
        }
        description="Club detail owns the MVP surface for memberships, events, and announcements so we can reuse the same shell and avoid extra top-level routes too early."
        eyebrow="Club detail"
        title={detail.club.name}
      />

      <ActionNotice notice={clubUpdateSuccessNotice} />
      <ActionNotice notice={assignmentSuccessNotice} />
      <ActionNotice notice={membershipUpdateSuccessNotice} />

      <ClubProfile
        detail={detail}
        membershipActions={(membership) => (
          <EditMembershipRoleDialog
            action={updateMembershipRoleAction}
            membership={membership}
            notice={
              membershipUpdateTarget === membership.id ? membershipUpdateErrorNotice : null
            }
          />
        )}
        memberships={memberships}
      />
    </div>
  );
}

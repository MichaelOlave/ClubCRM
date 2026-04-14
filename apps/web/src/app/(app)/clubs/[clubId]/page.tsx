import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  isOrgAdminBackendAuthSession,
  requireAuthorizedBackendSession,
} from "@/features/auth/server";
import {
  ClubManagerAccessCard,
  ClubProfile,
  CreateAnnouncementDialog,
  CreateEventDialog,
  EditAnnouncementDialog,
  EditClubDialog,
  EditEventDialog,
} from "@/features/clubs";
import {
  createAnnouncementAction,
  createClubManagerGrantAction,
  createEventAction,
  deleteAnnouncementAction,
  deleteClubManagerGrantAction,
  deleteEventAction,
  getClubDetail,
  getClubManagerGrants,
  updateAnnouncementAction,
  updateClubAction,
  updateEventAction,
} from "@/features/clubs/server";
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
    managerGrantCreated?: string | string[];
    managerGrantDeleted?: string | string[];
    managerGrantError?: string | string[];
    eventCreated?: string | string[];
    eventCreateError?: string | string[];
    eventUpdated?: string | string[];
    eventUpdateError?: string | string[];
    eventEditTarget?: string | string[];
    eventDeleted?: string | string[];
    eventDeleteError?: string | string[];
    announcementCreated?: string | string[];
    announcementCreateError?: string | string[];
    announcementUpdated?: string | string[];
    announcementUpdateError?: string | string[];
    announcementEditTarget?: string | string[];
    announcementDeleted?: string | string[];
    announcementDeleteError?: string | string[];
  }>;
};

export default async function ClubDetailPage({ params, searchParams }: Props) {
  const { clubId } = await params;
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const [detail, memberships, assignableMembers, managerGrants, query] = await Promise.all([
    getClubDetail(clubId, session),
    getMembershipsForClub(clubId, session),
    isOrgAdmin ? getAssignableMembersForClub(clubId) : Promise.resolve([]),
    getClubManagerGrants(clubId, session),
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
  const managerGrantNotice = getActionNotice(
    query.managerGrantCreated ?? query.managerGrantDeleted,
    query.managerGrantError
  );
  const eventCreateNotice = getActionNotice(query.eventCreated, query.eventCreateError);
  const eventUpdateNotice = getActionNotice(query.eventUpdated, query.eventUpdateError);
  const eventDeleteNotice = getActionNotice(query.eventDeleted, query.eventDeleteError);
  const announcementCreateNotice = getActionNotice(
    query.announcementCreated,
    query.announcementCreateError
  );
  const announcementUpdateNotice = getActionNotice(
    query.announcementUpdated,
    query.announcementUpdateError
  );
  const announcementDeleteNotice = getActionNotice(
    query.announcementDeleted,
    query.announcementDeleteError
  );
  const membershipUpdateTarget = Array.isArray(query.membershipUpdateTarget)
    ? query.membershipUpdateTarget[0]
    : query.membershipUpdateTarget;
  const eventEditTarget = Array.isArray(query.eventEditTarget)
    ? query.eventEditTarget[0]
    : query.eventEditTarget;
  const announcementEditTarget = Array.isArray(query.announcementEditTarget)
    ? query.announcementEditTarget[0]
    : query.announcementEditTarget;
  const assignmentSuccessNotice = assignmentNotice?.kind === "success" ? assignmentNotice : null;
  const assignmentErrorNotice = assignmentNotice?.kind === "error" ? assignmentNotice : null;
  const clubUpdateSuccessNotice = clubUpdateNotice?.kind === "success" ? clubUpdateNotice : null;
  const clubUpdateErrorNotice = clubUpdateNotice?.kind === "error" ? clubUpdateNotice : null;
  const eventCreateErrorNotice = eventCreateNotice?.kind === "error" ? eventCreateNotice : null;
  const eventCreateSuccessNotice = eventCreateNotice?.kind === "success" ? eventCreateNotice : null;
  const eventUpdateErrorNotice = eventUpdateNotice?.kind === "error" ? eventUpdateNotice : null;
  const eventUpdateSuccessNotice = eventUpdateNotice?.kind === "success" ? eventUpdateNotice : null;
  const announcementCreateErrorNotice =
    announcementCreateNotice?.kind === "error" ? announcementCreateNotice : null;
  const announcementCreateSuccessNotice =
    announcementCreateNotice?.kind === "success" ? announcementCreateNotice : null;
  const announcementUpdateErrorNotice =
    announcementUpdateNotice?.kind === "error" ? announcementUpdateNotice : null;
  const announcementUpdateSuccessNotice =
    announcementUpdateNotice?.kind === "success" ? announcementUpdateNotice : null;
  const membershipUpdateSuccessNotice =
    membershipUpdateNotice?.kind === "success" ? membershipUpdateNotice : null;
  const membershipUpdateErrorNotice =
    membershipUpdateNotice?.kind === "error" ? membershipUpdateNotice : null;
  const managerGrantSuccessNotice =
    managerGrantNotice?.kind === "success" ? managerGrantNotice : null;
  const managerGrantErrorNotice = managerGrantNotice?.kind === "error" ? managerGrantNotice : null;

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
            {isOrgAdmin ? (
              <AddMemberToClubDialog
                action={createMembershipAction}
                clubId={detail.club.id}
                members={assignableMembers}
                notice={assignmentErrorNotice}
              />
            ) : null}
            <CreateEventDialog
              action={createEventAction}
              clubId={detail.club.id}
              notice={eventCreateErrorNotice}
            />
            <CreateAnnouncementDialog
              action={createAnnouncementAction}
              clubId={detail.club.id}
              notice={announcementCreateErrorNotice}
            />
            <Button asChild variant="secondary">
              <Link href={`/clubs/${clubId}/join-requests`}>View join requests</Link>
            </Button>
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
      <ActionNotice notice={eventCreateSuccessNotice} />
      <ActionNotice notice={eventUpdateSuccessNotice} />
      <ActionNotice notice={eventDeleteNotice} />
      <ActionNotice notice={announcementCreateSuccessNotice} />
      <ActionNotice notice={announcementUpdateSuccessNotice} />
      <ActionNotice notice={announcementDeleteNotice} />
      <ActionNotice notice={membershipUpdateSuccessNotice} />
      <ActionNotice notice={managerGrantSuccessNotice} />
      <ActionNotice notice={managerGrantErrorNotice} />

      {isOrgAdmin ? (
        <ClubManagerAccessCard
          clubId={detail.club.id}
          createAction={createClubManagerGrantAction}
          currentGrants={managerGrants}
          deleteAction={deleteClubManagerGrantAction}
          memberships={memberships}
        />
      ) : null}

      <ClubProfile
        announcementActions={(announcement) => (
          <>
            <EditAnnouncementDialog
              action={updateAnnouncementAction}
              announcement={announcement}
              clubId={detail.club.id}
              notice={
                announcementEditTarget === announcement.id ? announcementUpdateErrorNotice : null
              }
            />
            <form action={deleteAnnouncementAction}>
              <input name="announcementId" type="hidden" value={announcement.id} />
              <input name="clubId" type="hidden" value={detail.club.id} />
              <Button size="sm" type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </>
        )}
        detail={detail}
        eventActions={(event) => (
          <>
            <EditEventDialog
              action={updateEventAction}
              clubId={detail.club.id}
              event={event}
              notice={eventEditTarget === event.id ? eventUpdateErrorNotice : null}
            />
            <form action={deleteEventAction}>
              <input name="clubId" type="hidden" value={detail.club.id} />
              <input name="eventId" type="hidden" value={event.id} />
              <Button size="sm" type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </>
        )}
        membershipActions={(membership) => (
          <EditMembershipRoleDialog
            action={updateMembershipRoleAction}
            membership={membership}
            notice={membershipUpdateTarget === membership.id ? membershipUpdateErrorNotice : null}
          />
        )}
        memberships={memberships}
      />
    </div>
  );
}

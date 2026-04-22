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
  const { clubId: clubIdentifier } = await params;
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const [detail, query] = await Promise.all([getClubDetail(clubIdentifier, session), searchParams]);

  if (!detail) {
    notFound();
  }

  const [memberships, assignableMembers, managerGrants] = await Promise.all([
    getMembershipsForClub(detail.club.id, session),
    isOrgAdmin ? getAssignableMembersForClub(detail.club.id) : Promise.resolve([]),
    getClubManagerGrants(detail.club.id, session),
  ]);

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
      <Button
        asChild
        className="px-0 text-muted-foreground hover:text-foreground"
        size="sm"
        variant="link"
      >
        <Link href="/clubs">Back to clubs</Link>
      </Button>

      <ClubProfile
        announcementActions={(announcement) => (
          <>
            <EditAnnouncementDialog
              action={updateAnnouncementAction}
              announcement={announcement}
              clubId={detail.club.id}
              clubSlug={detail.club.slug}
              notice={
                announcementEditTarget === announcement.id ? announcementUpdateErrorNotice : null
              }
            />
            <form action={deleteAnnouncementAction}>
              <input name="announcementId" type="hidden" value={announcement.id} />
              <input name="clubId" type="hidden" value={detail.club.id} />
              <input name="clubSlug" type="hidden" value={detail.club.slug} />
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
              clubSlug={detail.club.slug}
              event={event}
              notice={eventEditTarget === event.id ? eventUpdateErrorNotice : null}
            />
            <form action={deleteEventAction}>
              <input name="clubId" type="hidden" value={detail.club.id} />
              <input name="clubSlug" type="hidden" value={detail.club.slug} />
              <input name="eventId" type="hidden" value={event.id} />
              <Button size="sm" type="submit" variant="destructive">
                Delete
              </Button>
            </form>
          </>
        )}
        headerActions={
          <>
            <EditClubDialog
              action={updateClubAction}
              club={detail.club}
              notice={clubUpdateErrorNotice}
            />
            {isOrgAdmin ? (
              <ClubManagerAccessCard
                clubId={detail.club.id}
                clubSlug={detail.club.slug}
                createAction={createClubManagerGrantAction}
                currentGrants={managerGrants}
                deleteAction={deleteClubManagerGrantAction}
                memberships={memberships}
                notice={managerGrantErrorNotice}
              />
            ) : null}
          </>
        }
        activityActions={
          <>
            <CreateEventDialog
              action={createEventAction}
              clubId={detail.club.id}
              clubSlug={detail.club.slug}
              notice={eventCreateErrorNotice}
            />
            <CreateAnnouncementDialog
              action={createAnnouncementAction}
              clubId={detail.club.id}
              clubSlug={detail.club.slug}
              notice={announcementCreateErrorNotice}
            />
          </>
        }
        memberships={memberships}
        rosterActions={
          <>
            {isOrgAdmin ? (
              <AddMemberToClubDialog
                action={createMembershipAction}
                clubId={detail.club.id}
                clubSlug={detail.club.slug}
                members={assignableMembers}
                notice={assignmentErrorNotice}
              />
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href={`/clubs/${detail.club.slug}/join-requests`}>Review join requests</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/join/${detail.club.slug}`}>Open public form</Link>
            </Button>
          </>
        }
        renderMembershipAssignment={(membership) => (
          <EditMembershipRoleDialog
            action={updateMembershipRoleAction}
            clubSlug={detail.club.slug}
            membership={membership}
            notice={membershipUpdateTarget === membership.id ? membershipUpdateErrorNotice : null}
            trigger={
              <button
                className="rounded-[1rem] px-2 py-1 -mx-2 -my-1 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                type="button"
              >
                <span className="block font-semibold text-foreground">{membership.memberName}</span>
                <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {membership.clubName}
                </span>
              </button>
            }
          />
        )}
      />
    </div>
  );
}

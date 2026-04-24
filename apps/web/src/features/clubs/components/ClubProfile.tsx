import type { ReactNode } from "react";

import type { ClubDetailViewModel } from "@/features/clubs/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";

type Props = {
  announcementActions?: (announcement: ClubDetailViewModel["announcements"][number]) => ReactNode;
  detail: ClubDetailViewModel;
  eventActions?: (event: ClubDetailViewModel["events"][number]) => ReactNode;
  headerActions?: ReactNode;
  activityActions?: ReactNode;
  membershipActions?: (membership: MembershipRecord) => ReactNode;
  memberships: MembershipRecord[];
  rosterActions?: ReactNode;
  renderMembershipAssignment?: (membership: MembershipRecord) => ReactNode;
  renderMembershipRole?: (membership: MembershipRecord) => ReactNode;
  renderMembershipStatus?: (membership: MembershipRecord) => ReactNode;
};

function getStatusVariant(status: ClubDetailViewModel["club"]["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "planning":
      return "warning";
    case "archived":
      return "destructive";
    default:
      return "muted";
  }
}

function getAnnouncementVariant(status: ClubDetailViewModel["announcements"][number]["status"]) {
  return status === "published" ? "success" : "warning";
}

function getEventVariant(status: ClubDetailViewModel["events"][number]["status"]) {
  switch (status) {
    case "upcoming":
      return "success";
    case "in_progress":
      return "warning";
    case "past":
      return "muted";
    default:
      return "warning";
  }
}

function formatEventWindow(event: ClubDetailViewModel["events"][number]): string {
  if (!event.endsAt) {
    return formatDateTime(event.startsAt);
  }

  return `${formatDateTime(event.startsAt)} to ${formatDateTime(event.endsAt)}`;
}

export function ClubProfile({
  announcementActions,
  detail,
  eventActions,
  headerActions,
  activityActions,
  membershipActions,
  memberships,
  rosterActions,
  renderMembershipAssignment,
  renderMembershipRole,
  renderMembershipStatus,
}: Props) {
  return (
    <div className="space-y-6">
      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={getStatusVariant(detail.club.status)}>{detail.club.status}</Badge>
          {detail.club.tags.map((tag) => (
            <Badge key={tag} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-foreground">{detail.club.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {detail.club.description}
            </p>
            {headerActions ? (
              <div className="mt-5 flex flex-wrap gap-2">{headerActions}</div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Manager
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {detail.club.manager ?? "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Members
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {detail.club.memberCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Next event
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {detail.club.nextEventAt
                  ? formatDateTime(detail.club.nextEventAt)
                  : "No event scheduled"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <MembershipTable
        actionsHeader="Roster actions"
        description="This shared membership table can be reused by club detail, member detail, and future review workflows."
        headerActions={rosterActions}
        memberships={memberships}
        renderMembershipStatus={renderMembershipStatus}
        renderAssignment={renderMembershipAssignment}
        renderRole={renderMembershipRole}
        renderActions={membershipActions}
        title="Club roster"
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">Activity</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Events and announcements now live directly on the overview page instead of a separate
              tab.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {activityActions}
            <Badge variant="muted">
              {detail.events.length + detail.announcements.length} items
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
            <div>
              <h4 className="text-xl font-semibold text-foreground">Events</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Upcoming, in-progress, and past club events stay inside the club detail route for
                the MVP instead of becoming a separate top-level page.
              </p>
            </div>

            {detail.events.length ? (
              <div className="space-y-4">
                {detail.events.map((event) => (
                  <div className="rounded-[1.25rem] border border-border p-4" key={event.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={getEventVariant(event.status)}>{event.status}</Badge>
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {formatEventWindow(event)}
                          </p>
                        </div>
                        <div>
                          <h5 className="text-base font-semibold text-foreground">{event.title}</h5>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {event.location ?? "Location TBD"}
                          </p>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {event.description}
                        </p>
                      </div>

                      {eventActions ? (
                        <div className="flex flex-wrap gap-2">{eventActions(event)}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Use the add event action on this page to schedule the club's next activity."
                title="No events yet"
              />
            )}
          </Card>

          <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
            <div>
              <h4 className="text-xl font-semibold text-foreground">Announcements</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Announcement management also stays scoped to the selected club in this MVP.
              </p>
            </div>

            {detail.announcements.length ? (
              <div className="space-y-4">
                {detail.announcements.map((announcement) => (
                  <div className="rounded-[1.25rem] border border-border p-4" key={announcement.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={getAnnouncementVariant(announcement.status)}>
                            {announcement.status}
                          </Badge>
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {formatDateTime(announcement.publishedAt)}
                          </p>
                        </div>
                        <div>
                          <h5 className="text-base font-semibold text-foreground">
                            {announcement.title}
                          </h5>
                          {announcement.createdBy ? (
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Created by {announcement.createdBy}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {announcement.body}
                        </p>
                      </div>

                      {announcementActions ? (
                        <div className="flex flex-wrap gap-2">
                          {announcementActions(announcement)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Use the add announcement action on this page to publish or schedule an update."
                title="No announcements yet"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

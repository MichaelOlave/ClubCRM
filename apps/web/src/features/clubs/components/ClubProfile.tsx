import type { ReactNode } from "react";
import { Calendar, Info, Megaphone, ShieldCheck, Users } from "lucide-react";

import type { ClubDetailViewModel } from "@/features/clubs/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { TabScrollHandler } from "./TabScrollHandler";

type Props = {
  announcementActions?: (announcement: ClubDetailViewModel["announcements"][number]) => ReactNode;
  detail: ClubDetailViewModel;
  eventActions?: (event: ClubDetailViewModel["events"][number]) => ReactNode;
  headerActions?: ReactNode;
  eventCreateAction?: ReactNode;
  announcementCreateAction?: ReactNode;
  membershipActions?: (membership: MembershipRecord) => ReactNode;
  memberships: MembershipRecord[];
  rosterActions?: ReactNode;
  renderMembershipAssignment?: (membership: MembershipRecord) => ReactNode;
  renderMembershipRole?: (membership: MembershipRecord) => ReactNode;
  renderMembershipStatus?: (membership: MembershipRecord) => ReactNode;
  renderRowWrapper?: (membership: MembershipRecord, children: ReactNode) => ReactNode;
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
  eventCreateAction,
  announcementCreateAction,
  membershipActions,
  memberships,
  rosterActions,
  renderMembershipAssignment,
  renderMembershipRole,
  renderMembershipStatus,
  renderRowWrapper,
}: Props) {
  return (
    <div className="space-y-10">
      <TabScrollHandler />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col justify-between space-y-6 rounded-[2rem] border p-6 shadow-sm lg:col-span-2 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={getStatusVariant(detail.club.status)}>{detail.club.status}</Badge>
              {detail.club.tags.map((tag) => (
                <Badge key={tag} variant="muted">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">{detail.club.name}</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {detail.club.description}
              </p>
            </div>
          </div>
          {headerActions ? <div className="flex flex-wrap gap-3 pt-2">{headerActions}</div> : null}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="flex items-center gap-4 rounded-[1.5rem] border p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Primary Manager
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {detail.club.manager ?? "Unassigned"}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 rounded-[1.5rem] border p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Total Members
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {detail.club.memberCount} members
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 rounded-[1.5rem] border p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Next Scheduled Event
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {detail.club.nextEventAt
                  ? formatDateTime(detail.club.nextEventAt)
                  : "No events scheduled"}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Tabs className="w-full" defaultValue="roster">
        <div className="flex mb-10 overflow-x-auto pb-1">
          <TabsList className="h-14 items-center gap-2 rounded-2xl bg-muted/40 p-2">
            <TabsTrigger
              className="group h-10 gap-3 rounded-xl px-6 text-sm font-semibold transition-all duration-500 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/60"
              value="roster"
            >
              <Users className="h-4.5 w-4.5" />
              <span>Club Roster</span>
            </TabsTrigger>
            <TabsTrigger
              className="group h-10 gap-3 rounded-xl px-6 text-sm font-semibold transition-all duration-500 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/60"
              value="events"
            >
              <Calendar className="h-4.5 w-4.5" />
              <div className="flex items-center gap-2">
                <span>Events</span>
                <Badge
                  className="h-5 min-w-5 justify-center bg-muted/80 px-1 text-[10px] font-bold text-muted-foreground group-data-[state=active]:bg-brand/10 group-data-[state=active]:text-brand"
                  variant="muted"
                >
                  {detail.events.length}
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger
              className="group h-10 gap-3 rounded-xl px-6 text-sm font-semibold transition-all duration-500 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/60"
              value="announcements"
            >
              <Megaphone className="h-4.5 w-4.5" />
              <div className="flex items-center gap-2">
                <span>Announcements</span>
                <Badge
                  className="h-5 min-w-5 justify-center bg-muted/80 px-1 text-[10px] font-bold text-muted-foreground group-data-[state=active]:bg-brand/10 group-data-[state=active]:text-brand"
                  variant="muted"
                >
                  {detail.announcements.length}
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="roster">
          <MembershipTable
            actionsHeader="Roster management"
            description="View and manage the members assigned to this club, their roles, and current statuses."
            headerActions={rosterActions}
            memberships={memberships}
            renderMembershipStatus={renderMembershipStatus}
            renderAssignment={renderMembershipAssignment}
            renderRole={renderMembershipRole}
            renderActions={membershipActions}
            renderRowWrapper={renderRowWrapper}
            title="Club roster"
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="events">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-foreground">Upcoming events</h3>
              <p className="text-sm text-muted-foreground">
                Schedule and manage activities for your club members.
              </p>
            </div>
            {eventCreateAction}
          </div>

          {detail.events.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {detail.events.map((event) => (
                <Card
                  className="group relative overflow-hidden rounded-[1.5rem] border p-0 shadow-sm transition-all hover:shadow-md"
                  key={event.id}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                      <Badge variant={getEventVariant(event.status)}>{event.status}</Badge>
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatEventWindow(event)}
                      </p>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <h5 className="text-base font-semibold text-foreground">{event.title}</h5>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                            <span>{event.location ?? "Location TBD"}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {event.description}
                          </p>
                        </div>

                        {eventActions ? (
                          <div className="flex shrink-0 flex-wrap gap-2">{eventActions(event)}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Schedule the club's next activity to get started."
              title="No events yet"
            />
          )}
        </TabsContent>

        <TabsContent className="space-y-6" value="announcements">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-foreground">Club announcements</h3>
              <p className="text-sm text-muted-foreground">
                Keep your members informed with the latest updates and news.
              </p>
            </div>
            {announcementCreateAction}
          </div>

          {detail.announcements.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {detail.announcements.map((announcement) => (
                <Card
                  className="group relative overflow-hidden rounded-[1.5rem] border p-0 shadow-sm transition-all hover:shadow-md"
                  key={announcement.id}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                      <Badge variant={getAnnouncementVariant(announcement.status)}>
                        {announcement.status}
                      </Badge>
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDateTime(announcement.publishedAt)}
                      </p>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <h5 className="text-base font-semibold text-foreground">
                            {announcement.title}
                          </h5>
                          {announcement.createdBy ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>Created by {announcement.createdBy}</span>
                            </div>
                          ) : null}
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {announcement.body}
                          </p>
                        </div>

                        {announcementActions ? (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {announcementActions(announcement)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Post a new announcement to notify your club members."
              title="No announcements yet"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

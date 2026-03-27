import type { ClubDetailViewModel } from "@/features/clubs/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { TabsView } from "@/components/shadcn/tabs-view";
import { formatDateTime } from "@/lib/utils/formatters";

type Props = {
  detail: ClubDetailViewModel;
  memberships: MembershipRecord[];
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
  return status === "upcoming" ? "success" : "warning";
}

export function ClubProfile({ detail, memberships }: Props) {
  const overview = (
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
          </div>
          <div className="space-y-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Manager
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{detail.club.manager}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Members
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{detail.club.memberCount}</p>
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
        description="This shared membership table can be reused by club detail, member detail, and future review workflows."
        memberships={memberships}
        title="Club roster"
      />
    </div>
  );

  const activity = (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Upcoming events</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Events stay inside the club detail route for the MVP instead of becoming a separate
            top-level page.
          </p>
        </div>

        {detail.events.length ? (
          <div className="space-y-4">
            {detail.events.map((event) => (
              <div className="rounded-[1.25rem] border border-border p-4" key={event.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getEventVariant(event.status)}>{event.status}</Badge>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {formatDateTime(event.startsAt)}
                  </p>
                </div>
                <h4 className="mt-3 text-base font-semibold text-foreground">{event.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{event.location}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Event creation will plug into the same club detail surface when the CRUD workflow is added."
            title="No events yet"
          />
        )}
      </Card>

      <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Announcements</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Announcement management also stays scoped to the selected club in this MVP.
          </p>
        </div>

        {detail.announcements.length ? (
          <div className="space-y-4">
            {detail.announcements.map((announcement) => (
              <div className="rounded-[1.25rem] border border-border p-4" key={announcement.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getAnnouncementVariant(announcement.status)}>
                    {announcement.status}
                  </Badge>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {formatDateTime(announcement.publishedAt)}
                  </p>
                </div>
                <h4 className="mt-3 text-base font-semibold text-foreground">{announcement.title}</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {announcement.excerpt}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Published updates will appear here once announcement creation is connected."
            title="No announcements yet"
          />
        )}
      </Card>
    </div>
  );

  return (
    <TabsView
      activeId="overview"
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: overview,
        },
        {
          id: "activity",
          label: "Activity",
          count: detail.events.length + detail.announcements.length,
          content: activity,
        },
      ]}
    />
  );
}

import type { ClubDetailViewModel } from "@/features/clubs/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
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
      return "danger";
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
      <Card className="space-y-5">
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
            <h2 className="text-2xl font-semibold text-zinc-950">{detail.club.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
              {detail.club.description}
            </p>
          </div>
          <div className="space-y-3 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Manager
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">{detail.club.manager}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Members
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">{detail.club.memberCount}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                Next event
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">
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
      <Card className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-950">Upcoming events</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Events stay inside the club detail route for the MVP instead of becoming a separate
            top-level page.
          </p>
        </div>

        {detail.events.length ? (
          <div className="space-y-4">
            {detail.events.map((event) => (
              <div className="rounded-[1.25rem] border border-zinc-200 p-4" key={event.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getEventVariant(event.status)}>{event.status}</Badge>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {formatDateTime(event.startsAt)}
                  </p>
                </div>
                <h4 className="mt-3 text-base font-semibold text-zinc-950">{event.title}</h4>
                <p className="mt-1 text-sm text-zinc-600">{event.location}</p>
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

      <Card className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-950">Announcements</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Announcement management also stays scoped to the selected club in this MVP.
          </p>
        </div>

        {detail.announcements.length ? (
          <div className="space-y-4">
            {detail.announcements.map((announcement) => (
              <div className="rounded-[1.25rem] border border-zinc-200 p-4" key={announcement.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={getAnnouncementVariant(announcement.status)}>
                    {announcement.status}
                  </Badge>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {formatDateTime(announcement.publishedAt)}
                  </p>
                </div>
                <h4 className="mt-3 text-base font-semibold text-zinc-950">{announcement.title}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{announcement.excerpt}</p>
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
    <Tabs
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

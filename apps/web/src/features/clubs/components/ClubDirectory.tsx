import type { ClubRecord } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils/formatters";
import type { TableColumn } from "@/types/ui";

type Props = {
  clubs: ClubRecord[];
};

function getStatusVariant(status: ClubRecord["status"]) {
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

const columns: Array<TableColumn<ClubRecord>> = [
  {
    key: "club",
    header: "Club",
    render: (club) => (
      <div className="space-y-1">
        <p className="font-semibold text-zinc-950">{club.name}</p>
        <p className="max-w-md text-sm leading-6 text-zinc-600">{club.description}</p>
      </div>
    ),
  },
  {
    key: "manager",
    header: "Manager",
    render: (club) => (
      <div className="space-y-1">
        <p>{club.manager}</p>
        <Badge variant={getStatusVariant(club.status)}>{club.status}</Badge>
      </div>
    ),
  },
  {
    key: "members",
    header: "Members",
    render: (club) => `${club.memberCount}`,
    align: "right",
  },
  {
    key: "next-event",
    header: "Next event",
    render: (club) => (club.nextEventAt ? formatDateTime(club.nextEventAt) : "No event"),
    align: "right",
  },
  {
    key: "link",
    header: "Open",
    render: (club) => (
      <Button href={`/clubs/${club.id}`} size="sm" variant="secondary">
        View
      </Button>
    ),
    align: "right",
  },
];

export function ClubDirectory({ clubs }: Props) {
  return (
    <Table
      columns={columns}
      emptyState={
        <EmptyState
          description="As club creation lands, each record will show up here with a shared table layout and reusable status treatments."
          title="No clubs available yet"
        />
      }
      keyExtractor={(club) => club.id}
      rows={clubs}
    />
  );
}

import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { ClubRecord } from "@/types/api";
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
      return "destructive";
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
        <p className="font-semibold text-foreground">{club.name}</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">{club.description}</p>
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
      <Button asChild size="sm" variant="secondary">
        <Link href={`/clubs/${club.id}`}>View</Link>
      </Button>
    ),
    align: "right",
  },
];

export function ClubDirectory({ clubs }: Props) {
  return (
    <DataTable
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

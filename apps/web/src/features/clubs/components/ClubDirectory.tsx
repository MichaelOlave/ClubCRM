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
      <Link
        aria-label={`Open ${club.name}`}
        className="group block max-w-md rounded-[1rem] p-1 -m-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={`/clubs/${club.slug}`}
      >
        <div className="space-y-1">
          <p className="font-semibold text-foreground transition-colors group-hover:text-brand">
            {club.name}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{club.description}</p>
        </div>
      </Link>
    ),
  },
  {
    key: "manager",
    header: "Manager",
    render: (club) => (
      <div className="space-y-1">
        <p>{club.manager ?? "Unassigned"}</p>
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
        <Link href={`/clubs/${club.slug}`}>View</Link>
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
          description="No club records were returned by the connected API."
          title="No clubs available yet"
        />
      }
      keyExtractor={(club) => club.id}
      rows={clubs}
    />
  );
}

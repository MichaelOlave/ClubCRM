import Link from "next/link";
import { Calendar, Users } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { ClubRecord } from "@/types/api";
import { formatDateTime } from "@/lib/utils/formatters";
import type { TableColumn } from "@/types/ui";
import { ManagerAccessDialog } from "./ManagerAccessDialog";

type Props = {
  clubs: ClubRecord[];
  isOrgAdmin: boolean;
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

const getColumns = (isOrgAdmin: boolean): Array<TableColumn<ClubRecord>> => [
  {
    key: "club",
    header: "Club",
    render: (club) => (
      <div className="space-y-1 py-1 max-w-sm">
        <Link
          href={`/clubs/${club.slug}`}
          className="font-semibold text-foreground transition-colors hover:text-brand hover:underline"
        >
          {club.name}
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (club) => (
      <Badge variant={getStatusVariant(club.status)} className="capitalize">
        {club.status}
      </Badge>
    ),
  },
  {
    key: "manager",
    header: "Manager",
    render: (club) => <ManagerAccessDialog club={club} isOrgAdmin={isOrgAdmin} />,
  },
  {
    key: "members",
    header: "Members",
    render: (club) => (
      <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="font-medium text-foreground">{club.memberCount}</span>
      </div>
    ),
    align: "right",
  },
  {
    key: "next-event",
    header: "Next Event",
    render: (club) => (
      <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
        <Calendar className="h-4 w-4" />
        {club.nextEventAt ? (
          <span className="text-foreground">{formatDateTime(club.nextEventAt)}</span>
        ) : (
          <span className="italic">No event</span>
        )}
      </div>
    ),
    align: "right",
  },
];

export function ClubDirectory({ clubs, isOrgAdmin }: Props) {
  const columns = getColumns(isOrgAdmin);

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

import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { MemberRecord } from "@/types/api";
import type { TableColumn } from "@/types/ui";

type Props = {
  members: MemberRecord[];
};

function getStatusVariant(status: MemberRecord["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "secondary";
    default:
      return "warning";
  }
}

const columns: Array<TableColumn<MemberRecord>> = [
  {
    key: "member",
    header: "Member",
    render: (member) => (
      <Link
        aria-label={`Open ${member.firstName} ${member.lastName} profile`}
        className="block rounded-[1rem] px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={`/members/${member.id}`}
      >
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {member.firstName} {member.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </Link>
    ),
  },
  {
    key: "student-id",
    header: "Student ID",
    render: (member) => member.studentId ?? "Not provided",
  },
  {
    key: "primary-club",
    header: "Primary club",
    render: (member) =>
      member.primaryClubId && member.primaryClub ? (
        <Link
          aria-label={`Open ${member.primaryClub} club`}
          className="block rounded-[1rem] px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={`/clubs/${member.primaryClubId}`}
        >
          <div className="space-y-1">
            <p>{member.primaryClub}</p>
            <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
          </div>
        </Link>
      ) : (
        <div className="space-y-1">
          <p>{member.primaryClub ?? "No club assignment"}</p>
          <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
        </div>
      ),
  },
  {
    key: "clubs",
    header: "Club count",
    render: (member) => `${member.clubCount}`,
    align: "right",
  },
  {
    key: "open",
    header: "Open",
    render: (member) => (
      <Button asChild size="sm" variant="secondary">
        <Link href={`/members/${member.id}`}>View profile</Link>
      </Button>
    ),
    align: "right",
  },
];

export function MemberDirectory({ members }: Props) {
  return (
    <DataTable
      columns={columns}
      emptyState={
        <EmptyState
          description="No member records were returned by the connected API."
          title="No members available yet"
        />
      }
      keyExtractor={(member) => member.id}
      rows={members}
    />
  );
}

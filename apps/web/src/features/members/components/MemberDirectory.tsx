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
  return status === "active" ? "success" : "warning";
}

const columns: Array<TableColumn<MemberRecord>> = [
  {
    key: "member",
    header: "Member",
    render: (member) => (
      <div className="space-y-1">
        <p className="font-semibold text-foreground">
          {member.firstName} {member.lastName}
        </p>
        <p className="text-sm text-muted-foreground">{member.email}</p>
      </div>
    ),
  },
  {
    key: "student-id",
    header: "Student ID",
    render: (member) => member.studentId,
  },
  {
    key: "primary-club",
    header: "Primary club",
    render: (member) => (
      <div className="space-y-1">
        <p>{member.primaryClub}</p>
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
          description="Organization-level member records will appear here when member CRUD is connected."
          title="No members available yet"
        />
      }
      keyExtractor={(member) => member.id}
      rows={members}
    />
  );
}

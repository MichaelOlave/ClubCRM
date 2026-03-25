import type { MemberRecord } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
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
        <p className="font-semibold text-zinc-950">
          {member.firstName} {member.lastName}
        </p>
        <p className="text-sm text-zinc-600">{member.email}</p>
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
      <Button href={`/members/${member.id}`} size="sm" variant="secondary">
        View profile
      </Button>
    ),
    align: "right",
  },
];

export function MemberDirectory({ members }: Props) {
  return (
    <Table
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

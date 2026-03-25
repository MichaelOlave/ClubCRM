import type { MembershipTableModel } from "@/features/memberships/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils/formatters";
import type { TableColumn } from "@/types/ui";

const columns: Array<TableColumn<MembershipTableModel["memberships"][number]>> = [
  {
    key: "member-or-club",
    header: "Assignment",
    render: (membership) => (
      <div className="space-y-1">
        <p className="font-semibold text-zinc-950">{membership.memberName}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{membership.clubName}</p>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (membership) => membership.role,
  },
  {
    key: "status",
    header: "Status",
    render: (membership) => (
      <Badge variant={membership.status === "active" ? "success" : "warning"}>
        {membership.status}
      </Badge>
    ),
  },
  {
    key: "joined-at",
    header: "Joined",
    render: (membership) => formatDate(membership.joinedAt),
    align: "right",
  },
];

export function MembershipTable({
  description = "Membership assignment stays in a reusable table so both club and member detail routes can share it.",
  memberships,
  title = "Memberships",
}: MembershipTableModel) {
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-zinc-950">{title}</h3>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>

      <Table
        columns={columns}
        emptyState={
          <EmptyState
            description="Assignments will appear here once the membership flow is wired to the backend."
            title="No memberships yet"
          />
        }
        keyExtractor={(membership) => membership.id}
        rows={memberships}
      />
    </Card>
  );
}

import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { MembershipTableModel } from "@/features/memberships/types";
import { formatDate } from "@/lib/utils/formatters";
import type { TableColumn } from "@/types/ui";

const columns: Array<TableColumn<MembershipTableModel["memberships"][number]>> = [
  {
    key: "member-or-club",
    header: "Assignment",
    render: (membership) => (
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{membership.memberName}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {membership.clubName}
        </p>
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
    <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <DataTable
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

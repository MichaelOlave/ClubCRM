import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { MembershipTableModel } from "@/features/memberships/types";
import { formatDate } from "@/lib/utils/formatters";
import type { TableColumn } from "@/types/ui";

function getStatusVariant(status: MembershipTableModel["memberships"][number]["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "secondary";
    default:
      return "warning";
  }
}

export function MembershipTable({
  actionsHeader = "Actions",
  description = "Membership assignment stays in a reusable table so both club and member detail routes can share it.",
  headerActions,
  memberships,
  renderAssignment,
  renderMembershipStatus,
  renderRole,
  renderActions,
  title = "Memberships",
}: MembershipTableModel) {
  const columns: Array<TableColumn<MembershipTableModel["memberships"][number]>> = [
    {
      key: "member-or-club",
      header: "Assignment",
      render: (membership) =>
        renderAssignment?.(membership) ?? (
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
      render: (membership) => renderRole?.(membership) ?? membership.role,
    },
    {
      key: "status",
      header: "Status",
      render: (membership) =>
        renderMembershipStatus?.(membership) ?? (
          <Badge variant={getStatusVariant(membership.status)}>{membership.status}</Badge>
        ),
    },
    {
      key: "joined-at",
      header: "Joined",
      render: (membership) =>
        membership.joinedAt ? formatDate(membership.joinedAt) : "Unavailable",
      align: "right",
    },
  ];

  if (renderActions) {
    columns.push({
      key: "actions",
      header: actionsHeader,
      render: (membership) => <div className="flex justify-end">{renderActions(membership)}</div>,
      align: "right",
    });
  }

  return (
    <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
      </div>

      <DataTable
        columns={columns}
        emptyState={
          <EmptyState
            description="No membership assignments were returned by the connected API."
            title="No memberships yet"
          />
        }
        keyExtractor={(membership) => membership.id}
        rows={memberships}
      />
    </Card>
  );
}

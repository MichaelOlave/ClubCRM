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
  description = "View and manage current club memberships, roles, and joined dates.",
  headerActions,
  memberships,
  renderAssignment,
  renderMembershipStatus,
  renderRole,
  renderActions,
  renderRowWrapper,
  title = "Memberships",
}: MembershipTableModel) {
  const columns: Array<TableColumn<MembershipTableModel["memberships"][number]>> = [
    {
      key: "member-or-club",
      header: "Assignment",
      render: (membership) =>
        renderAssignment?.(membership) ?? (
          <p className="font-semibold text-foreground">{membership.memberName}</p>
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
    <Card className="space-y-6 rounded-[2rem] border p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
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
        renderRowWrapper={renderRowWrapper}
        rows={memberships}
      />
    </Card>
  );
}

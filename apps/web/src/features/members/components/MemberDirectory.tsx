import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { DataTable } from "@/components/shadcn/data-table";
import { EmptyState } from "@/components/shadcn/empty-state";
import { Pagination } from "@/components/ui/Pagination";
import type { MemberRecord } from "@/types/api";
import type { TableColumn } from "@/types/ui";

type Props = {
  members: MemberRecord[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  searchParams?: Record<string, string | string[] | undefined>;
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
            <p className="font-medium text-foreground">{member.primaryClub}</p>
            <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
          </div>
        </Link>
      ) : (
        <div className="space-y-1">
          <p className="text-muted-foreground italic">
            {member.primaryClub ?? "No club assignment"}
          </p>
          <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
        </div>
      ),
  },
  {
    key: "clubs",
    header: "Club count",
    render: (member) => (
      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold text-foreground">{member.clubCount}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Clubs
        </span>
      </div>
    ),
    align: "right",
  },
  {
    key: "open",
    header: "Action",
    render: (member) => (
      <Button asChild size="sm" variant="outline" className="rounded-xl border-border/50 shadow-sm">
        <Link href={`/members/${member.id}`}>View profile</Link>
      </Button>
    ),
    align: "right",
  },
];

export function MemberDirectory({
  members,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  searchParams,
}: Props) {
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        emptyState={
          <EmptyState
            description="No member records were found matching your search criteria."
            title="No members found"
          />
        }
        keyExtractor={(member) => member.id}
        rows={members}
      />
      <Pagination
        baseUrl="/members"
        currentPage={currentPage}
        pageSize={pageSize}
        searchParams={searchParams}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
}

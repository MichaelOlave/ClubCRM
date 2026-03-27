import type { MemberDetailViewModel } from "@/features/members/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { TabsView } from "@/components/shadcn/tabs-view";

type Props = {
  detail: MemberDetailViewModel;
  memberships: MembershipRecord[];
};

function getStatusVariant(status: MemberDetailViewModel["member"]["status"]) {
  return status === "active" ? "success" : "warning";
}

export function MemberProfile({ detail, memberships }: Props) {
  const profile = (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-3">
          <Badge variant={getStatusVariant(detail.member.status)}>{detail.member.status}</Badge>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {detail.member.firstName} {detail.member.lastName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail.member.email}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4 text-sm text-foreground/80">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Student ID
            </p>
            <p className="mt-1 font-semibold text-foreground">{detail.member.studentId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Primary club
            </p>
            <p className="mt-1 font-semibold text-foreground">{detail.member.primaryClub}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Club count
            </p>
            <p className="mt-1 font-semibold text-foreground">{detail.member.clubCount}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Profile notes</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Member detail keeps cross-club context in one place, which is why the profile route
            lives outside any single club.
          </p>
        </div>

        {detail.notes.length ? (
          <div className="space-y-3">
            {detail.notes.map((note) => (
              <div className="rounded-[1.25rem] border border-border p-4" key={note}>
                <p className="text-sm leading-6 text-foreground/80">{note}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Add club-specific notes later without losing the organization-level member record."
            title="No notes yet"
          />
        )}
      </Card>
    </div>
  );

  const assignments = (
    <MembershipTable
      description="Assignments are shared across both club and member detail routes."
      memberships={memberships}
      title="Club assignments"
    />
  );

  return (
    <TabsView
      activeId="profile"
      tabs={[
        {
          id: "profile",
          label: "Profile",
          content: profile,
        },
        {
          id: "assignments",
          label: "Assignments",
          count: memberships.length,
          content: assignments,
        },
      ]}
    />
  );
}

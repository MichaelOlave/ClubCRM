import type { MemberDetailViewModel } from "@/features/members/types";
import { MembershipTable } from "@/features/memberships";
import type { MembershipRecord } from "@/types/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";

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
      <Card className="space-y-5">
        <div className="space-y-3">
          <Badge variant={getStatusVariant(detail.member.status)}>{detail.member.status}</Badge>
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950">
              {detail.member.firstName} {detail.member.lastName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{detail.member.email}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Student ID
            </p>
            <p className="mt-1 font-semibold text-zinc-950">{detail.member.studentId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Primary club
            </p>
            <p className="mt-1 font-semibold text-zinc-950">{detail.member.primaryClub}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Club count
            </p>
            <p className="mt-1 font-semibold text-zinc-950">{detail.member.clubCount}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-950">Profile notes</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Member detail keeps cross-club context in one place, which is why the profile route
            lives outside any single club.
          </p>
        </div>

        {detail.notes.length ? (
          <div className="space-y-3">
            {detail.notes.map((note) => (
              <div className="rounded-[1.25rem] border border-zinc-200 p-4" key={note}>
                <p className="text-sm leading-6 text-zinc-700">{note}</p>
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
    <Tabs
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

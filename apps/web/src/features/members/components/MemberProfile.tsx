import Link from "next/link";

import type { MemberDetailViewModel } from "@/features/members/types";
import { MembershipTable, UpdateMembershipStatusForm } from "@/features/memberships";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";

type Props = {
  membershipStatusAction: (formData: FormData) => Promise<void>;
  detail: MemberDetailViewModel;
};

function getStatusVariant(status: MemberDetailViewModel["member"]["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "secondary";
    default:
      return "warning";
  }
}

export function MemberProfile({ detail, membershipStatusAction }: Props) {
  const memberDetailPath = `/members/${detail.member.id}`;

  return (
    <div className="space-y-6">
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
              <p className="mt-1 font-semibold text-foreground">
                {detail.member.studentId ?? "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Primary club
              </p>
              {detail.member.primaryClubId && detail.member.primaryClub ? (
                <Link
                  className="mt-1 inline-block rounded-md font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href={`/clubs/${detail.member.primaryClubId}`}
                >
                  {detail.member.primaryClub}
                </Link>
              ) : (
                <p className="mt-1 font-semibold text-foreground">
                  {detail.member.primaryClub ?? "No club assignment"}
                </p>
              )}
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
            <h3 className="text-xl font-semibold text-foreground">Record details</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This panel reflects the current backend member record rather than mock-only profile
              notes.
            </p>
          </div>

          {detail.metadata.length ? (
            <div className="space-y-3">
              {detail.metadata.map((item) => (
                <div className="rounded-[1.25rem] border border-border p-4" key={item.label}>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="The backend did not return any extra member metadata."
              title="No extra details yet"
            />
          )}
        </Card>
      </div>

      <MembershipTable
        actionsHeader="Status actions"
        description="Assignments now render directly on the member profile so the detail view stays in one place."
        memberships={detail.memberships}
        renderAssignment={(membership) => (
          <Link
            aria-label={`Open ${membership.clubName} club`}
            className="block rounded-[1rem] px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`/clubs/${membership.clubId}`}
          >
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{membership.clubName}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Club membership
              </p>
            </div>
          </Link>
        )}
        renderActions={(membership) => (
          <UpdateMembershipStatusForm
            action={membershipStatusAction}
            membership={membership}
            redirectPath={memberDetailPath}
          />
        )}
        title="Club assignments"
      />
    </div>
  );
}

import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import { MembershipRoleSelect } from "@/features/memberships/components/MembershipRoleSelect";
import type { JoinRequestRecord } from "@/types/api";

type Props = {
  approveAction: (formData: FormData) => Promise<void>;
  clubSlug: string;
  denyAction: (formData: FormData) => Promise<void>;
  requests: JoinRequestRecord[];
};

function getStatusVariant(status: JoinRequestRecord["status"]) {
  switch (status) {
    case "approved":
      return "success";
    case "denied":
      return "destructive";
    default:
      return "warning";
  }
}

export function JoinRequestReviewList({ approveAction, clubSlug, denyAction, requests }: Props) {
  if (!requests.length) {
    return (
      <EmptyState
        description="New public join submissions for this club will appear here as soon as prospective members send them."
        title="No pending join requests"
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {requests.map((request) => (
        <Card
          className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8"
          key={request.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{request.submitterName}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {request.submitterEmail}
                </p>
              </div>
            </div>

            <div className="grid min-w-[14rem] gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4 text-sm text-foreground/80">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Requested role
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {request.role ?? "General interest"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Student ID
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {request.studentId ?? "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Why this club?
            </p>
            <p className="mt-2 text-sm leading-7 text-foreground/80">
              {request.message ?? "No personal note was provided with this request."}
            </p>
          </div>

          <div className="space-y-4 rounded-[1.25rem] border border-dashed border-border bg-muted/30 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Review action
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                Approving reuses the member record by email when it already exists, otherwise it
                creates a new member from the submitted form details and adds them to this club.
              </p>
            </div>

            <form action={approveAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input name="clubId" type="hidden" value={request.clubId} />
              <input name="clubSlug" type="hidden" value={clubSlug} />
              <input name="joinRequestId" type="hidden" value={request.id} />

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
                <span>Club role on approval</span>
                <MembershipRoleSelect defaultValue="member" />
              </label>

              <div className="flex items-end">
                <Button className="w-full sm:w-auto" size="sm" type="submit">
                  Approve and add
                </Button>
              </div>
            </form>

            <form action={denyAction} className="flex justify-end">
              <input name="clubId" type="hidden" value={request.clubId} />
              <input name="clubSlug" type="hidden" value={clubSlug} />
              <input name="joinRequestId" type="hidden" value={request.id} />
              <Button size="sm" type="submit" variant="destructive">
                Deny request
              </Button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}

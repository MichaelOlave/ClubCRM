import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { EmptyState } from "@/components/shadcn/empty-state";
import type { JoinRequestRecord } from "@/types/api";

type Props = {
  requests: JoinRequestRecord[];
};

function getStatusVariant(status: JoinRequestRecord["status"]) {
  return status === "approved" ? "success" : "warning";
}

export function JoinRequestReviewList({ requests }: Props) {
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
        </Card>
      ))}
    </div>
  );
}

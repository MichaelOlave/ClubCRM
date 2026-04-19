import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { ActionNotice } from "@/components/ui/ActionNotice";
import { requireAuthorizedBackendSession } from "@/features/auth/server";
import { JoinRequestReviewList } from "@/features/forms/join-request";
import { getJoinRequestReview } from "@/features/forms/join-request/server";
import {
  approveJoinRequestAction,
  denyJoinRequestAction,
} from "@/features/forms/join-request/server/actions";
import { getActionNotice } from "@/lib/forms";

type Props = {
  params: Promise<{
    clubId: string;
  }>;
  searchParams: Promise<{
    joinRequestUpdated?: string | string[];
    joinRequestError?: string | string[];
  }>;
};

export default async function ClubJoinRequestsPage({ params, searchParams }: Props) {
  const { clubId } = await params;
  const session = await requireAuthorizedBackendSession();
  const [review, query] = await Promise.all([getJoinRequestReview(clubId, session), searchParams]);

  if (!review) {
    notFound();
  }

  const reviewNotice = getActionNotice(query.joinRequestUpdated, query.joinRequestError);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/join/${clubId}`}>Open public form</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/clubs/${clubId}`}>Back to club</Link>
            </Button>
          </>
        }
        description="Review the pending public join request forms for this club without leaving the protected club workspace."
        eyebrow="Join requests"
        title={`${review.clubName} join requests`}
      />

      <ActionNotice notice={reviewNotice} />

      <Card className="grid gap-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8 lg:grid-cols-[minmax(0,14rem)_1fr]">
        <div className="rounded-[1.25rem] border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Pending requests
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {review.requests.length}
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Current public form context</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {review.clubDescription ||
              "Prospective members use the public join form to introduce themselves and share how they want to contribute."}
          </p>
        </div>
      </Card>

      <JoinRequestReviewList
        approveAction={approveJoinRequestAction}
        denyAction={denyJoinRequestAction}
        requests={review.requests}
      />
    </div>
  );
}

import Link from "next/link";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClubDirectory } from "@/features/clubs";
import { getClubList } from "@/features/clubs/server";

export default async function ClubsPage() {
  const clubs = await getClubList();
  const previewJoinHref = clubs[0] ? `/join/${clubs[0].id}` : null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/members">View members</Link>
            </Button>
            {previewJoinHref ? (
              <Button asChild variant="ghost">
                <Link href={previewJoinHref}>Preview public form</Link>
              </Button>
            ) : null}
          </>
        }
        description="The club directory uses a shared table primitive today, and the plan is to attach create and edit flows through reusable drawers before introducing dedicated management routes."
        eyebrow="Clubs"
        title="Club directory"
      />

      <Alert variant="info">
        <AlertDescription>
          Club-specific events and announcements stay inside each club detail page for the MVP to
          keep the route map compact.
        </AlertDescription>
      </Alert>

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">All clubs</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            This list is intentionally read-only for now so we can validate the shared shell and
            feature boundaries first.
          </p>
        </div>
        <ClubDirectory clubs={clubs} />
      </Card>
    </div>
  );
}

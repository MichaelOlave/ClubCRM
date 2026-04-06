import Link from "next/link";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClubDirectory, CreateClubDialog } from "@/features/clubs";
import { createClubAction, getClubList } from "@/features/clubs/server";
import { getActionNotice } from "@/lib/forms";

type Props = {
  searchParams: Promise<{
    clubCreated?: string | string[];
    clubError?: string | string[];
  }>;
};

export default async function ClubsPage({ searchParams }: Props) {
  const clubs = await getClubList();
  const query = await searchParams;
  const previewJoinHref = clubs[0] ? `/join/${clubs[0].id}` : null;
  const clubNotice = getActionNotice(query.clubCreated, query.clubError);
  const clubSuccessNotice = clubNotice?.kind === "success" ? clubNotice : null;
  const clubErrorNotice = clubNotice?.kind === "error" ? clubNotice : null;

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <CreateClubDialog
              action={createClubAction}
              defaultOrganizationId={clubs[0]?.organizationId ?? ""}
              notice={clubErrorNotice}
            />
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
        description="Create clubs from this directory, then open each club to manage the roster, events, and announcements in one shared admin surface."
        eyebrow="Clubs"
        title="Club directory"
      />

      <Alert variant="info">
        <AlertDescription>
          Club-specific events, announcements, and roster management still stay inside each club
          detail page so the admin route map remains compact.
        </AlertDescription>
      </Alert>

      <ActionNotice notice={clubSuccessNotice} />

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">All clubs</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Use this directory to jump into each club after creation and manage the roster from its
            detail view.
          </p>
        </div>
        <ClubDirectory clubs={clubs} />
      </Card>
    </div>
  );
}

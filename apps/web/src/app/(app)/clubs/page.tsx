import Link from "next/link";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  isOrgAdminBackendAuthSession,
  requireAuthorizedBackendSession,
} from "@/features/auth/server";
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
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const clubs = await getClubList(session);
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
            {isOrgAdmin ? (
              <CreateClubDialog
                action={createClubAction}
                defaultOrganizationId={clubs[0]?.organizationId ?? ""}
                notice={clubErrorNotice}
              />
            ) : null}
            {isOrgAdmin ? (
              <Button asChild variant="secondary">
                <Link href="/members">View members</Link>
              </Button>
            ) : null}
            {previewJoinHref ? (
              <Button asChild variant="ghost">
                <Link href={previewJoinHref}>Preview public form</Link>
              </Button>
            ) : null}
          </>
        }
        description={
          isOrgAdmin
            ? "Create clubs from this directory, then open each club to manage the roster, join requests, and manager access in one shared workspace."
            : "Open your assigned clubs here to review the roster, join requests, and club-owned activity without the org-wide admin routes."
        }
        eyebrow="Clubs"
        title="Club directory"
      />

      <Alert variant="info">
        <AlertDescription>
          {isOrgAdmin
            ? "Club-specific events, announcements, roster management, and manager assignment stay inside each club detail page so the route map remains compact."
            : "Your club detail pages are scoped to the clubs in your manager grant, including roster updates and join-request review."}
        </AlertDescription>
      </Alert>

      <ActionNotice notice={clubSuccessNotice} />

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">All clubs</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {isOrgAdmin
              ? "Use this directory to jump into each club after creation and manage the roster from its detail view."
              : "Use this directory to jump directly into the clubs you manage and handle club-specific workflows from the detail view."}
          </p>
        </div>
        <ClubDirectory clubs={clubs} />
      </Card>
    </div>
  );
}

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Card } from "@/components/shadcn/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
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
    page?: string | string[];
  }>;
};

const PAGE_SIZE = 10;

export default async function ClubsPage({ searchParams }: Props) {
  const session = await requireAuthorizedBackendSession();
  const isOrgAdmin = isOrgAdminBackendAuthSession(session);
  const clubs = await getClubList(session);
  const query = await searchParams;
  const clubNotice = getActionNotice(query.clubCreated, query.clubError);
  const clubSuccessNotice = clubNotice?.kind === "success" ? clubNotice : null;
  const clubErrorNotice = clubNotice?.kind === "error" ? clubNotice : null;

  const currentPage = typeof query.page === "string" ? Math.max(1, parseInt(query.page, 10)) : 1;
  const totalItems = clubs.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedClubs = clubs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <PageHeader
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

      <Card className="space-y-6 rounded-[2rem] border p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-foreground">Available clubs</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {isOrgAdmin
                ? "Select a club to manage its roster, scheduled events, and official announcements."
                : "Access the clubs you manage to review rosters and handle club-specific tasks."}
            </p>
          </div>
          {isOrgAdmin && (
            <div className="shrink-0">
              <CreateClubDialog action={createClubAction} notice={clubErrorNotice} />
            </div>
          )}
        </div>
        <ClubDirectory clubs={paginatedClubs} isOrgAdmin={isOrgAdmin} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/clubs"
          pageSize={PAGE_SIZE}
          totalItems={totalItems}
        />
      </Card>
    </div>
  );
}

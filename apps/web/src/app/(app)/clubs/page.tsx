import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { ClubDirectory } from "@/features/clubs";
import { getClubList } from "@/features/clubs/server";

export default async function ClubsPage() {
  const clubs = await getClubList();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href="/members" variant="secondary">
              View members
            </Button>
            <Button href="/join/chess-society" variant="ghost">
              Preview public form
            </Button>
          </>
        }
        description="The club directory uses a shared table primitive today, and the plan is to attach create and edit flows through reusable drawers before introducing dedicated management routes."
        eyebrow="Clubs"
        title="Club directory"
      />

      <Toast tone="info">
        Club-specific events and announcements stay inside each club detail page for the MVP to keep
        the route map compact.
      </Toast>

      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-zinc-950">All clubs</h2>
          <p className="text-sm leading-6 text-zinc-600">
            This list is intentionally read-only for now so we can validate the shared shell and
            feature boundaries first.
          </p>
        </div>
        <ClubDirectory clubs={clubs} />
      </Card>
    </div>
  );
}

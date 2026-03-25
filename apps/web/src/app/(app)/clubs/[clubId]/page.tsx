import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ClubProfile } from "@/features/clubs";
import { getClubDetail } from "@/features/clubs/server";
import { getMembershipsForClub } from "@/features/memberships/server";

type Props = {
  params: Promise<{
    clubId: string;
  }>;
};

export default async function ClubDetailPage({ params }: Props) {
  const { clubId } = await params;
  const detail = await getClubDetail(clubId);

  if (!detail) {
    notFound();
  }

  const memberships = await getMembershipsForClub(clubId);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href={`/join/${clubId}`} variant="secondary">
              Open public form
            </Button>
            <Button href="/clubs" variant="ghost">
              Back to clubs
            </Button>
          </>
        }
        description="Club detail owns the MVP surface for memberships, events, and announcements so we can reuse the same shell and avoid extra top-level routes too early."
        eyebrow="Club detail"
        title={detail.club.name}
      />

      <ClubProfile detail={detail} memberships={memberships} />
    </div>
  );
}

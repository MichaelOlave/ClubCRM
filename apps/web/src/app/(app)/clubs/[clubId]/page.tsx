import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
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
            <Button asChild variant="secondary">
              <Link href={`/join/${clubId}`}>Open public form</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/clubs">Back to clubs</Link>
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

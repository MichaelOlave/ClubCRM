import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MemberProfile } from "@/features/members";
import { getMemberDetail } from "@/features/members/server";
import { getMembershipsForMember } from "@/features/memberships/server";

type Props = {
  params: Promise<{
    memberId: string;
  }>;
};

export default async function MemberDetailPage({ params }: Props) {
  const { memberId } = await params;
  const detail = await getMemberDetail(memberId);

  if (!detail) {
    notFound();
  }

  const memberships = await getMembershipsForMember(memberId);

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href="/members" variant="secondary">
              Back to members
            </Button>
            {memberships[0] ? (
              <Button href={`/clubs/${memberships[0].clubId}`} variant="ghost">
                Open primary club
              </Button>
            ) : null}
          </>
        }
        description="Member detail keeps organization-wide identity, notes, and club assignments together so we can reuse the same record across multiple workflows."
        eyebrow="Member detail"
        title={`${detail.member.firstName} ${detail.member.lastName}`}
      />

      <MemberProfile detail={detail} memberships={memberships} />
    </div>
  );
}

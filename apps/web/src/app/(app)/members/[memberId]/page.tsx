import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/layout/PageHeader";
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
            <Button asChild variant="secondary">
              <Link href="/members">Back to members</Link>
            </Button>
            {memberships[0] ? (
              <Button asChild variant="ghost">
                <Link href={`/clubs/${memberships[0].clubId}`}>Open primary club</Link>
              </Button>
            ) : null}
          </>
        }
        description="Member detail keeps organization-wide identity, backend record metadata, and club assignments together so we can reuse the same record across multiple workflows."
        eyebrow="Member detail"
        title={`${detail.member.firstName} ${detail.member.lastName}`}
      />

      <MemberProfile detail={detail} memberships={memberships} />
    </div>
  );
}

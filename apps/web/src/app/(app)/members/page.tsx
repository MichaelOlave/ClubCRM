import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { MemberDirectory } from "@/features/members";
import { getMemberList } from "@/features/members/server";

export default async function MembersPage() {
  const members = await getMemberList();

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <Button href="/clubs" variant="secondary">
              View clubs
            </Button>
            <Button href="/dashboard" variant="ghost">
              Back to dashboard
            </Button>
          </>
        }
        description="Members are modeled at the organization level, so this directory stays outside any single club and links back into shared membership detail."
        eyebrow="Members"
        title="Member directory"
      />

      <Toast tone="info">
        This route is where create-member and assign-to-club drawers can plug in later without
        changing the page structure.
      </Toast>

      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-zinc-950">Organization members</h2>
          <p className="text-sm leading-6 text-zinc-600">
            Shared records prevent duplicate member entries when someone belongs to more than one
            club.
          </p>
        </div>
        <MemberDirectory members={members} />
      </Card>
    </div>
  );
}

import { Button } from "@/components/shadcn/button";
import type { MembershipRecord } from "@/types/api";

type Props = {
  action: (formData: FormData) => Promise<void>;
  membership: MembershipRecord;
  redirectPath: string;
};

const selectClassName =
  "flex h-10 min-w-32 rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

export function UpdateMembershipStatusForm({ action, membership, redirectPath }: Props) {
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input name="clubId" type="hidden" value={membership.clubId} />
      <input name="memberId" type="hidden" value={membership.memberId} />
      <input name="membershipId" type="hidden" value={membership.id} />
      <input name="redirectPath" type="hidden" value={redirectPath} />

      <select
        aria-label={`Set ${membership.clubName} membership status`}
        className={selectClassName}
        defaultValue={membership.status}
        name="status"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="pending">Pending</option>
      </select>

      <Button size="sm" type="submit" variant="outline">
        Save status
      </Button>
    </form>
  );
}

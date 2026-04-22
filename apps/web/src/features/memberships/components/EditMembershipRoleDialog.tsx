"use client";

import { useState } from "react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { MembershipRoleSelect } from "@/features/memberships/components/MembershipRoleSelect";
import type { MembershipRecord } from "@/types/api";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  clubSlug: string;
  membership: MembershipRecord;
  notice: ActionNoticeModel | null;
  trigger?: React.ReactNode;
};

export function EditMembershipRoleDialog({ action, clubSlug, membership, notice, trigger }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            Edit role
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit member role</DialogTitle>
          <DialogDescription>
            Update this member&apos;s role for {membership.clubName}. Their roster status stays the
            same.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4">
          <input name="clubId" type="hidden" value={membership.clubId} />
          <input name="clubSlug" type="hidden" value={clubSlug} />
          <input name="memberId" type="hidden" value={membership.memberId} />
          <input name="membershipId" type="hidden" value={membership.id} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Member</span>
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground/80">
              {membership.memberName}
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Role</span>
            <MembershipRoleSelect defaultValue={membership.role} />
          </label>

          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import type { MemberDetailViewModel } from "@/features/members/types";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  member: MemberDetailViewModel["member"];
  notice: ActionNoticeModel | null;
};

export function DeleteMemberDialog({ action, member, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));
  const memberName = `${member.firstName} ${member.lastName}`;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="destructive">Remove member</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remove member record</DialogTitle>
          <DialogDescription>
            This removes {memberName} from the organization directory and clears their current club
            assignments.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-foreground/80">
          {member.clubCount
            ? `${memberName} is currently assigned to ${member.clubCount} club${member.clubCount === 1 ? "" : "s"}.`
            : `${memberName} is not assigned to any clubs right now.`}
        </div>

        <form action={action} className="space-y-4">
          <input name="memberId" type="hidden" value={member.id} />
          <input name="memberName" type="hidden" value={memberName} />

          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Remove member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

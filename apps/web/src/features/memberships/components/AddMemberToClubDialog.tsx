"use client";

import { useState } from "react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
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
import type { MembershipAssignmentCandidate } from "@/features/memberships/types";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  clubId: string;
  clubSlug: string;
  members: MembershipAssignmentCandidate[];
  notice: ActionNoticeModel | null;
};

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

export function AddMemberToClubDialog({ action, clubId, clubSlug, members, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Add member</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a member to this club</DialogTitle>
          <DialogDescription>
            Choose an organization member who is not on this roster yet, then assign the role they
            should start with.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        {members.length ? (
          <form action={action} className="grid gap-4 lg:grid-cols-3">
            <input name="clubId" type="hidden" value={clubId} />
            <input name="clubSlug" type="hidden" value={clubSlug} />

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-3">
              <span>Member</span>
              <select className={selectClassName} defaultValue={members[0]?.id} name="memberId">
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
              <span>Role</span>
              <MembershipRoleSelect />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
              <span>Status</span>
              <select className={selectClassName} defaultValue="active" name="status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </label>

            <DialogFooter className="lg:col-span-3">
              <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button type="submit">Add to club</Button>
            </DialogFooter>
          </form>
        ) : (
          <Alert variant="info">
            <AlertDescription>
              No unassigned members are available for this roster yet. Create a new member from the
              member directory if you need someone else to join this club.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}

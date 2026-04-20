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
import { Input } from "@/components/shadcn/input";
import type { MemberDetailViewModel } from "@/features/members/types";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";
import { TEXT_LIMITS } from "@/lib/textLimits";

type Props = {
  action: (formData: FormData) => Promise<void>;
  member: MemberDetailViewModel["member"];
  notice: ActionNoticeModel | null;
};

export function EditMemberDialog({ action, member, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit member</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update the member profile details used across the directory and club roster views.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="memberId" type="hidden" value={member.id} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>First name</span>
            <Input
              defaultValue={member.firstName}
              maxLength={TEXT_LIMITS.memberName}
              name="firstName"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Last name</span>
            <Input
              defaultValue={member.lastName}
              maxLength={TEXT_LIMITS.memberName}
              name="lastName"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Email address</span>
            <Input
              defaultValue={member.email}
              maxLength={TEXT_LIMITS.email}
              name="email"
              required
              type="email"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Student ID</span>
            <Input
              defaultValue={member.studentId ?? ""}
              maxLength={TEXT_LIMITS.studentId}
              name="studentId"
              placeholder="Optional"
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save member</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

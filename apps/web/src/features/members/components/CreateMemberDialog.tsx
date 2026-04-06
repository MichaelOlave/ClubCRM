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
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultOrganizationId: string;
  notice: ActionNoticeModel | null;
};

export function CreateMemberDialog({ action, defaultOrganizationId, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Create member</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a member</DialogTitle>
          <DialogDescription>
            Member records stay organization-wide, which means you only create someone once before
            assigning them to one or more clubs.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Organization ID</span>
            <Input
              defaultValue={defaultOrganizationId}
              name="organizationId"
              placeholder="Existing backend organization ID"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>First name</span>
            <Input name="firstName" placeholder="Jordan" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Last name</span>
            <Input name="lastName" placeholder="Lee" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Email address</span>
            <Input name="email" placeholder="jordan@champlain.edu" required type="email" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Student ID</span>
            <Input name="studentId" placeholder="Optional" />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Create member</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

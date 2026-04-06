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
import { Textarea } from "@/components/shadcn/textarea";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultOrganizationId: string;
  notice: ActionNoticeModel | null;
};

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

export function CreateClubDialog({ action, defaultOrganizationId, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Create club</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a club</DialogTitle>
          <DialogDescription>
            New clubs appear in the shared directory immediately, so you can add members and start
            using the detail workflow without leaving this page.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Organization ID</span>
            <Input
              defaultValue={defaultOrganizationId}
              name="organizationId"
              placeholder="Existing backend organization ID"
              required
            />
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              This is prefilled from existing club data when the frontend already knows the active
              organization.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Club status</span>
            <select className={selectClassName} defaultValue="active" name="status">
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Club name</span>
            <Input name="name" placeholder="Robotics Club" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Description</span>
            <Textarea
              name="description"
              placeholder="What the club does, who it is for, and how members participate."
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Create club</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

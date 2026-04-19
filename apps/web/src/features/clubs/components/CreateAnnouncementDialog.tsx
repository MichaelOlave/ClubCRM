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
  clubId: string;
  notice: ActionNoticeModel | null;
};

export function CreateAnnouncementDialog({ action, clubId, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Add announcement</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create an announcement</DialogTitle>
          <DialogDescription>
            Publish an update right away or schedule it for later so the club detail page stays
            current.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="clubId" type="hidden" value={clubId} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Announcement title</span>
            <Input name="title" placeholder="Welcome back, makers" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Publish at</span>
            <Input name="publishedAt" type="datetime-local" />
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Leave this blank to publish immediately.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Created by</span>
            <Input name="createdBy" placeholder="Alex Morgan" type="text" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Message</span>
            <Textarea
              name="body"
              placeholder="Share the latest update, reminder, or recap with members."
              required
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Create announcement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

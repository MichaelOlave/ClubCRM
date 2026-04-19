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
import type { ClubDetailViewModel } from "@/features/clubs/types";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  action: (formData: FormData) => Promise<void>;
  announcement: ClubDetailViewModel["announcements"][number];
  clubId: string;
  notice: ActionNoticeModel | null;
};

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function EditAnnouncementDialog({ action, announcement, clubId, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit announcement</DialogTitle>
          <DialogDescription>
            Update the announcement message and publish time shown in the club activity view.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="clubId" type="hidden" value={clubId} />
          <input name="announcementId" type="hidden" value={announcement.id} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Announcement title</span>
            <Input defaultValue={announcement.title} name="title" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Publish at</span>
            <Input
              defaultValue={toDateTimeLocalValue(announcement.publishedAt)}
              name="publishedAt"
              required
              type="datetime-local"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Created by</span>
            <Input
              defaultValue={announcement.createdBy ?? ""}
              name="createdBy"
              placeholder="Alex Morgan"
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Message</span>
            <Textarea
              defaultValue={announcement.body}
              name="body"
              placeholder="Share the latest update, reminder, or recap with members."
              required
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save announcement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  clubId: string;
  event: ClubDetailViewModel["events"][number];
  notice: ActionNoticeModel | null;
};

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function EditEventDialog({ action, clubId, event, notice }: Props) {
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
          <DialogTitle>Edit event</DialogTitle>
          <DialogDescription>
            Update the event details shown on the club activity tab and dashboard activity feed.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="clubId" type="hidden" value={clubId} />
          <input name="eventId" type="hidden" value={event.id} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Event title</span>
            <Input defaultValue={event.title} name="title" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Starts at</span>
            <Input
              defaultValue={toDateTimeLocalValue(event.startsAt)}
              name="startsAt"
              required
              type="datetime-local"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Ends at</span>
            <Input
              defaultValue={event.endsAt ? toDateTimeLocalValue(event.endsAt) : undefined}
              name="endsAt"
              type="datetime-local"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Location</span>
            <Input
              defaultValue={event.location ?? ""}
              name="location"
              placeholder="Student Center, Room 204"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Description</span>
            <Textarea
              defaultValue={event.description}
              name="description"
              placeholder="What should members expect, and what do they need to bring?"
              required
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

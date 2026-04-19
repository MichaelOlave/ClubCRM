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

export function CreateEventDialog({ action, clubId, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Add event</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create an event</DialogTitle>
          <DialogDescription>
            Schedule the club&apos;s next activity so it appears in the activity feed and dashboard
            rollup.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="clubId" type="hidden" value={clubId} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Event title</span>
            <Input name="title" placeholder="Spring kickoff social" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Starts at</span>
            <Input name="startsAt" required type="datetime-local" />
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Future events appear in the upcoming activity panel after you save them.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Ends at</span>
            <Input name="endsAt" type="datetime-local" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Location</span>
            <Input name="location" placeholder="Student Center, Room 204" />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Description</span>
            <Textarea
              name="description"
              placeholder="What should members expect, and what do they need to bring?"
              required
            />
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Create event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

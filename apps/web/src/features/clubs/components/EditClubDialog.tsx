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
import { TEXT_LIMITS } from "@/lib/textLimits";

type Props = {
  action: (formData: FormData) => Promise<void>;
  club: ClubDetailViewModel["club"];
  notice: ActionNoticeModel | null;
};

const selectClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

export function EditClubDialog({ action, club, notice }: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit club</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit club</DialogTitle>
          <DialogDescription>
            Update the club details shown throughout the directory, roster views, and dashboard.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input name="clubId" type="hidden" value={club.id} />
          <input name="clubSlug" type="hidden" value={club.slug} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Club name</span>
            <Input defaultValue={club.name} maxLength={TEXT_LIMITS.clubName} name="name" required />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Club status</span>
            <select className={selectClassName} defaultValue={club.status} name="status">
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 lg:col-span-2">
            <span>Description</span>
            <Textarea
              defaultValue={club.description}
              maxLength={TEXT_LIMITS.clubDescription}
              name="description"
            />
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Up to {TEXT_LIMITS.clubDescription} characters.
            </span>
          </label>

          <DialogFooter className="lg:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save club</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
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
} from "@/components/shadcn/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { MembershipRoleSelect } from "@/features/memberships/components/MembershipRoleSelect";
import type { MembershipRecord } from "@/types/api";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Props = {
  action: (formData: FormData) => Promise<void>;
  clubSlug: string;
  triggerDescription?: string;
  triggerLabel?: string;
  triggerLabelClassName?: string;
  triggerClassName?: string;
  triggerTooltip?: React.ReactNode;
  triggerAriaLabel?: string;
  membership: MembershipRecord;
  notice: ActionNoticeModel | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function EditMembershipRoleDialog({
  action,
  clubSlug,
  triggerAriaLabel,
  triggerClassName,
  triggerDescription,
  triggerLabel,
  triggerLabelClassName,
  membership,
  notice,
  triggerTooltip,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(Boolean(notice && notice.kind === "error"));
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const dialogTrigger = triggerLabel ? (
    <Button
      aria-label={triggerAriaLabel}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn(
        "-mx-2 -my-1 rounded-[1rem] px-2 py-1 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        triggerClassName
      )}
      onClick={() => setOpen(true)}
      type="button"
      variant="ghost"
    >
      <span className={cn("block font-semibold text-foreground", triggerLabelClassName)}>
        {triggerLabel}
      </span>
      {triggerDescription ? (
        <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {triggerDescription}
        </span>
      ) : null}
    </Button>
  ) : null;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {dialogTrigger ? (
        triggerTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{dialogTrigger}</TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {triggerTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          dialogTrigger
        )
      ) : null}

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit member role</DialogTitle>
          <DialogDescription>
            Update this member&apos;s role for {membership.clubName}. Their roster status stays the
            same.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <form action={action} className="grid gap-4">
          <input name="clubId" type="hidden" value={membership.clubId} />
          <input name="clubSlug" type="hidden" value={clubSlug} />
          <input name="memberId" type="hidden" value={membership.memberId} />
          <input name="membershipId" type="hidden" value={membership.id} />

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Member</span>
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground/80">
              {membership.memberName}
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Role</span>
            <MembershipRoleSelect defaultValue={membership.role} />
          </label>

          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

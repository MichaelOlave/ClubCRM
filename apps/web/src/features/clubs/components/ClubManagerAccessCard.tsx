"use client";

import { useState } from "react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import { EmptyState } from "@/components/shadcn/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";
import { TEXT_LIMITS } from "@/lib/textLimits";
import type { MembershipRecord, BackendClubManagerGrantRecord } from "@/types/api";

type Props = {
  clubId: string;
  clubSlug: string;
  createAction: (formData: FormData) => Promise<void>;
  currentGrants: BackendClubManagerGrantRecord[];
  deleteAction: (formData: FormData) => Promise<void>;
  memberships: MembershipRecord[];
  notice: ActionNoticeModel | null;
};

type EligibleManagerCandidate = {
  memberId: string;
  memberName: string;
};

const inputClassName =
  "flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

function getEligibleCandidates(
  memberships: MembershipRecord[],
  currentGrants: BackendClubManagerGrantRecord[]
): EligibleManagerCandidate[] {
  const grantedMemberIds = new Set(currentGrants.map((grant) => grant.member_id));

  return memberships
    .filter(
      (membership) => membership.status === "active" && !grantedMemberIds.has(membership.memberId)
    )
    .map((membership) => ({
      memberId: membership.memberId,
      memberName: membership.memberName,
    }))
    .sort((left, right) => left.memberName.localeCompare(right.memberName));
}

export function ClubManagerAccessCard({
  clubId,
  clubSlug,
  createAction,
  currentGrants,
  deleteAction,
  memberships,
  notice,
}: Props) {
  const [open, setOpen] = useState(Boolean(notice && notice.kind === "error"));
  const eligibleCandidates = getEligibleCandidates(memberships, currentGrants);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">Manager access</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[min(90vh,56rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">Admin only</p>
          <DialogTitle>Club manager access</DialogTitle>
          <DialogDescription>
            Grant or revoke club-manager access for active roster members. This controls who can
            sign in and manage this club in the protected workspace.
          </DialogDescription>
        </DialogHeader>

        <ActionNotice notice={notice} />

        <div className="space-y-6">
          {currentGrants.length ? (
            <div className="space-y-3">
              {currentGrants.map((grant) => (
                <div
                  className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between"
                  key={grant.id}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{grant.member_name}</p>
                      <Badge variant="secondary">{grant.role_name}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{grant.member_email}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Granted {formatDateTime(grant.assigned_at)}
                    </p>
                  </div>

                  <form action={deleteAction}>
                    <input name="clubId" type="hidden" value={clubId} />
                    <input name="clubSlug" type="hidden" value={clubSlug} />
                    <input name="grantId" type="hidden" value={grant.id} />
                    <Button type="submit" variant="outline">
                      Revoke access
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="No club-manager grants exist yet for this club."
              title="No managers assigned"
            />
          )}

          {eligibleCandidates.length ? (
            <form
              action={createAction}
              className="grid gap-4 rounded-[1.25rem] border border-border bg-brand-surface p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
            >
              <input name="clubId" type="hidden" value={clubId} />
              <input name="clubSlug" type="hidden" value={clubSlug} />

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
                <span>Roster member</span>
                <select
                  className={inputClassName}
                  defaultValue={eligibleCandidates[0]?.memberId}
                  name="memberId"
                >
                  {eligibleCandidates.map((candidate) => (
                    <option key={candidate.memberId} value={candidate.memberId}>
                      {candidate.memberName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
                <span>Manager title</span>
                <input
                  className={inputClassName}
                  defaultValue="Club Manager"
                  maxLength={TEXT_LIMITS.clubManagerTitle}
                  name="roleName"
                  placeholder="Club Manager"
                  type="text"
                />
              </label>

              <div className="flex items-end">
                <Button className="w-full lg:w-auto" type="submit">
                  Grant access
                </Button>
              </div>
            </form>
          ) : (
            <Alert variant="info">
              <AlertDescription>
                Only active roster members can receive club-manager access. Add or activate a member
                on this club roster first if you need another manager.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

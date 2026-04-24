"use client";

import { useEffect, useState, useTransition } from "react";
import { Shield } from "lucide-react";

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
import { Skeleton } from "@/components/shadcn/skeleton";
import { formatDateTime } from "@/lib/utils/formatters";
import type { ClubRecord, MembershipRecord, BackendClubManagerGrantRecord } from "@/types/api";
import { TEXT_LIMITS } from "@/lib/textLimits";
import {
  getClubManagerAccessData,
  createClubManagerGrantAction,
  deleteClubManagerGrantAction,
} from "../server/actions";

type Props = {
  club: ClubRecord;
  isOrgAdmin: boolean;
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

export function ManagerAccessDialog({ club, isOrgAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<{
    memberships: MembershipRecord[];
    managerGrants: BackendClubManagerGrantRecord[];
  } | null>(null);

  useEffect(() => {
    if (open && !data && !isPending) {
      startTransition(async () => {
        try {
          const res = await getClubManagerAccessData(club.id);
          setData(res);
        } catch (error) {
          console.error("Failed to fetch manager access data", error);
        }
      });
    }
  }, [open, club.id, data, isPending]);

  if (!isOrgAdmin) {
    return (
      <span className="text-sm font-medium text-foreground">
        {club.manager ?? (
          <span className="text-muted-foreground italic font-normal">Unassigned</span>
        )}
      </span>
    );
  }

  const eligibleCandidates = data
    ? getEligibleCandidates(data.memberships, data.managerGrants)
    : [];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <button
          className="group flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          {club.manager ?? (
            <span className="text-muted-foreground italic font-normal">Unassigned</span>
          )}
          <Shield className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-brand" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[min(90vh,56rem)] max-w-4xl overflow-y-auto rounded-[2rem]">
        <DialogHeader>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">Admin only</p>
          <DialogTitle>Club manager access: {club.name}</DialogTitle>
          <DialogDescription>
            Grant or revoke club-manager access for active roster members. This controls who can
            sign in and manage this club in the protected workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-[1.25rem]" />
              <Skeleton className="h-48 w-full rounded-[1.25rem]" />
            </div>
          ) : data ? (
            <>
              <div className="space-y-6">
                {data.managerGrants.length ? (
                  <div className="space-y-3">
                    {data.managerGrants.map((grant) => (
                      <div
                        className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between"
                        key={grant.id}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {grant.member_name}
                            </p>
                            <Badge variant="secondary">{grant.role_name}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{grant.member_email}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Granted {formatDateTime(grant.assigned_at)}
                          </p>
                        </div>

                        <form action={deleteClubManagerGrantAction}>
                          <input name="clubId" type="hidden" value={club.id} />
                          <input name="clubSlug" type="hidden" value={club.slug} />
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
                    action={createClubManagerGrantAction}
                    className="grid gap-4 rounded-[1.25rem] border border-border bg-brand-surface p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
                  >
                    <input name="clubId" type="hidden" value={club.id} />
                    <input name="clubSlug" type="hidden" value={club.slug} />

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
                      Only active roster members can receive club-manager access. Add or activate a
                      member on this club roster first if you need another manager.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">Failed to load manager access data.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

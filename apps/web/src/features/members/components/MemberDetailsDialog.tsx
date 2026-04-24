"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, IdCard, ExternalLink, ShieldCheck, Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Badge } from "@/components/shadcn/badge";
import { Skeleton } from "@/components/shadcn/skeleton";
import type { MemberDetailViewModel } from "@/features/members/types";
import { getMemberDetailAction } from "@/features/members/server/actions";
import { updateMembershipStatusClientAction } from "@/features/memberships/server/actions";
import { cn } from "@/lib/utils";
import { CopyableValue } from "@/components/ui/CopyableValue";

type Props = {
  memberId: string;
  currentClubId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function MemberDetailsDialog({
  memberId,
  currentClubId,
  triggerLabel,
  triggerClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [detail, setDetail] = useState<MemberDetailViewModel | null>(null);

  useEffect(() => {
    if (open && !detail && !isPending) {
      startTransition(async () => {
        try {
          const res = await getMemberDetailAction(memberId);
          setDetail(res);
        } catch (error) {
          console.error("Failed to fetch member details", error);
        }
      });
    }
  }, [open, memberId, detail, isPending]);

  const handleStatusChange = async (membershipId: string, status: string, clubId: string) => {
    startUpdateTransition(async () => {
      try {
        const res = await updateMembershipStatusClientAction(
          membershipId,
          status,
          memberId,
          clubId
        );
        if (res.success) {
          // Re-fetch local detail and refresh router
          const updatedDetail = await getMemberDetailAction(memberId);
          setDetail(updatedDetail);
          router.refresh();
        }
      } catch (error) {
        console.error("Failed to update status", error);
      }
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {triggerLabel ? (
        <DialogTrigger asChild>
          <button
            className={cn(
              "block w-full text-left font-semibold text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              triggerClassName
            )}
            type="button"
          >
            {triggerLabel}
          </button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-xl rounded-[2rem]">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:h-16 sm:w-16">
              <User className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <DialogTitle className="text-xl sm:text-2xl">Member information</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Full directory record for{" "}
                {detail?.member ? `${detail.member.firstName} ${detail.member.lastName}` : "member"}
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4 sm:mt-4 sm:space-y-6">
          {isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : detail ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <CopyableValue
                  value={`${detail.member.firstName} ${detail.member.lastName}`}
                  className="min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </p>
                      <p className="font-semibold text-foreground break-words">
                        {detail.member.firstName} {detail.member.lastName}
                      </p>
                    </div>
                  </div>
                </CopyableValue>

                <CopyableValue value={detail.member.email} className="min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email address
                      </p>
                      <p className="font-semibold text-foreground break-all">
                        {detail.member.email}
                      </p>
                    </div>
                  </div>
                </CopyableValue>

                <CopyableValue value={detail.member.studentId ?? ""} className="min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Student ID
                      </p>
                      <p className="font-semibold text-foreground break-all">
                        {detail.member.studentId ?? "Not provided"}
                      </p>
                    </div>
                  </div>
                </CopyableValue>

                <div className="flex items-start gap-3 rounded-2xl border border-border p-4 min-w-0">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Roster Status
                    </p>
                    <Badge
                      className="capitalize"
                      variant={detail.member.status === "active" ? "success" : "muted"}
                    >
                      {detail.member.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {detail.memberships.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Active assignments</h4>
                  <div className="grid gap-2">
                    {detail.memberships.map((membership) => (
                      <div
                        className="flex items-center justify-between rounded-xl bg-muted/30 p-3"
                        key={membership.id}
                      >
                        <div className="space-y-0.5">
                          {membership.clubId === currentClubId ? (
                            <p className="text-sm font-semibold text-foreground">
                              {membership.clubName}
                            </p>
                          ) : (
                            <Link
                              className="group/link flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand"
                              href={`/clubs/${membership.clubId}`}
                            >
                              <span>{membership.clubName}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover/link:opacity-100" />
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{membership.role}</p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              className={cn(
                                "h-7 gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-wider transition-colors",
                                membership.status === "active" &&
                                  "bg-success/15 text-success-foreground hover:bg-success/25",
                                membership.status === "pending" &&
                                  "bg-warning/15 text-warning-foreground hover:bg-warning/25",
                                membership.status === "inactive" &&
                                  "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                              disabled={isUpdating}
                              size="sm"
                              variant="outline"
                            >
                              <span>{membership.status}</span>
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            {(["active", "inactive", "pending"] as const).map((status) => (
                              <DropdownMenuItem
                                className="flex items-center justify-between py-2 text-xs font-medium"
                                key={status}
                                onClick={() =>
                                  handleStatusChange(membership.id, status, membership.clubId)
                                }
                              >
                                <span className="capitalize">{status}</span>
                                {membership.status === status && (
                                  <Check className="h-3.5 w-3.5 text-brand" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <Button asChild className="gap-2" variant="outline">
                  <Link href={`/members/${memberId}`}>
                    <ExternalLink className="h-4 w-4" />
                    <span>View full profile</span>
                  </Link>
                </Button>
                <Button onClick={() => setOpen(false)} variant="secondary">
                  Close
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">Failed to load member details.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

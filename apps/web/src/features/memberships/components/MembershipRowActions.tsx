"use client";

import { useState, type ReactNode } from "react";
import { User, Edit, ShieldCheck, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/shadcn/context-menu";
import { MemberDetailsDialog } from "@/features/members";
import { EditMembershipRoleDialog } from "@/features/memberships/components/EditMembershipRoleDialog";
import { updateMembershipStatusClientAction } from "../server/actions";
import type { MembershipRecord } from "@/types/api";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  children: ReactNode;
  membership: MembershipRecord;
  clubSlug: string;
  updateRoleAction: (formData: FormData) => Promise<void>;
  updateRoleNotice: ActionNoticeModel | null;
  membershipUpdateTarget: string | null | undefined;
};

export function MembershipRowActions({
  children,
  membership,
  clubSlug,
  updateRoleAction,
  updateRoleNotice,
  membershipUpdateTarget,
}: Props) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(
    Boolean(
      updateRoleNotice &&
      updateRoleNotice.kind === "error" &&
      membershipUpdateTarget === membership.id
    )
  );
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: MembershipRecord["status"]) => {
    if (status === membership.status || updating) return;

    setUpdating(true);
    try {
      const res = await updateMembershipStatusClientAction(
        membership.id,
        status,
        membership.memberId,
        membership.clubId
      );
      if (res.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update membership status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <MemberDetailsDialog
        currentClubId={membership.clubId}
        memberId={membership.memberId}
        onOpenChange={setInfoOpen}
        open={infoOpen}
      />
      <EditMembershipRoleDialog
        action={updateRoleAction}
        clubSlug={clubSlug}
        membership={membership}
        notice={membershipUpdateTarget === membership.id ? updateRoleNotice : null}
        onOpenChange={setRoleOpen}
        open={roleOpen}
      />

      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64 rounded-xl shadow-lg">
          <ContextMenuItem className="gap-2.5 py-2.5" onClick={() => setInfoOpen(true)}>
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">View member info</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="gap-2.5 py-2.5" onClick={() => setRoleOpen(true)}>
            <Edit className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Edit membership role</span>
          </ContextMenuItem>

          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2.5 py-2.5">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Change status</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40 rounded-lg">
              {(["active", "inactive", "pending"] as const).map((status) => (
                <ContextMenuItem
                  key={status}
                  className="flex items-center justify-between py-2"
                  onClick={() => handleStatusChange(status)}
                >
                  <span className="capitalize">{status}</span>
                  {membership.status === status && <Check className="h-3.5 w-3.5 text-brand" />}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

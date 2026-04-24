"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { MembershipRecord } from "@/types/api";
import { updateMembershipStatusClientAction } from "../server/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

const statusOptions: Array<{ label: string; value: MembershipRecord["status"] }> = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
];

function getBadgeClasses(status: MembershipRecord["status"]) {
  switch (status) {
    case "active":
      return "border-green-300 bg-green-50 text-green-700";
    case "inactive":
      return "border-gray-300 bg-gray-100 text-gray-600";
    default:
      return "border-yellow-300 bg-yellow-50 text-yellow-700";
  }
}

export function MembershipStatusSelect({ membership }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleStatusSelect = async (status: MembershipRecord["status"]) => {
    if (status === membership.status) return;

    setUpdating(true);
    try {
      await updateMembershipStatusClientAction(
        membership.id,
        status,
        membership.memberId,
        membership.clubId
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to update membership status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 cursor-pointer hover:opacity-80 disabled:cursor-wait disabled:opacity-50 ${getBadgeClasses(membership.status)}`}
          disabled={updating}
          type="button"
        >
          {membership.status}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={`flex items-center gap-2 text-xs font-medium ${
              option.value === membership.status ? "bg-accent" : ""
            }`}
            onClick={() => handleStatusSelect(option.value)}
          >
            <span
              className={`inline-block size-2 rounded-full ring-1 ring-inset ${
                option.value === membership.status
                  ? "bg-current opacity-100 ring-transparent"
                  : "bg-transparent ring-border"
              }`}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Props = {
  membership: MembershipRecord;
};

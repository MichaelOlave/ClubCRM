"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMembershipApi } from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getRequiredString } from "@/lib/forms";

export async function createMembershipAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const memberId = getRequiredString(formData, "memberId", "Member");
  const role = getRequiredString(formData, "role", "Role");
  const status = getRequiredString(formData, "status", "Membership status");
  const redirectPath = `/clubs/${clubId}`;
  let successRedirectPath = redirectPath;

  try {
    await createMembershipApi({
      club_id: clubId,
      member_id: memberId,
      role,
      status,
    });

    revalidatePath("/clubs");
    revalidatePath(redirectPath);
    revalidatePath("/members");
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(redirectPath, {
      membershipCreated: "The club roster has been updated.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(redirectPath, {
        membershipError: getApiErrorMessage(
          error,
          "The member could not be added to this club right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

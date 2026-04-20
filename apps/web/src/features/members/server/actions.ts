"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminApiHeaders } from "@/lib/api/adminAuthHeaders";
import { requireOrgAdminBackendSession } from "@/features/auth/server";
import { createMemberApi, updateMemberApi } from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getOptionalString, getRequiredString } from "@/lib/forms";

export async function createMemberAction(formData: FormData) {
  const session = await requireOrgAdminBackendSession("/members");
  const firstName = getRequiredString(formData, "firstName", "First name");
  const lastName = getRequiredString(formData, "lastName", "Last name");
  const email = getRequiredString(formData, "email", "Email address");
  const studentId = getOptionalString(formData, "studentId");
  let successRedirectPath = "/members";

  try {
    const member = await createMemberApi(
      {
        organization_id: session.access.organizationId,
        first_name: firstName,
        last_name: lastName,
        email,
        student_id: studentId,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: "/members" }),
      }
    );

    revalidatePath("/members");
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams("/members", {
      memberCreated: `${member.first_name} ${member.last_name} can now be assigned to a club.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams("/members", {
        memberError: getApiErrorMessage(error, "The member could not be created right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function updateMemberAction(formData: FormData) {
  const memberId = getRequiredString(formData, "memberId", "Member");
  const firstName = getRequiredString(formData, "firstName", "First name");
  const lastName = getRequiredString(formData, "lastName", "Last name");
  const email = getRequiredString(formData, "email", "Email address");
  const studentId = getOptionalString(formData, "studentId");
  const detailPath = `/members/${memberId}`;
  let successRedirectPath = detailPath;

  try {
    const member = await updateMemberApi(
      memberId,
      {
        first_name: firstName,
        last_name: lastName,
        email,
        student_id: studentId,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

    revalidatePath("/members");
    revalidatePath(detailPath);
    revalidatePath("/clubs");
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      memberUpdated: `${member.first_name} ${member.last_name} has been updated.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        memberUpdateError: getApiErrorMessage(error, "The member could not be updated right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClubApi, updateClubApi } from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getOptionalString, getRequiredString } from "@/lib/forms";

export async function createClubAction(formData: FormData) {
  const organizationId = getRequiredString(formData, "organizationId", "Organization ID");
  const name = getRequiredString(formData, "name", "Club name");
  const status = getRequiredString(formData, "status", "Club status");
  const description = getOptionalString(formData, "description") ?? "";
  let successRedirectPath = "/clubs";

  try {
    const club = await createClubApi({
      organization_id: organizationId,
      name,
      description,
      status,
    });

    revalidatePath("/clubs");
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams("/clubs", {
      clubCreated: `${club.name} is ready for member assignments.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams("/clubs", {
        clubError: getApiErrorMessage(error, "The club could not be created right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function updateClubAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const name = getRequiredString(formData, "name", "Club name");
  const status = getRequiredString(formData, "status", "Club status");
  const description = getOptionalString(formData, "description") ?? "";
  const detailPath = `/clubs/${clubId}`;
  let successRedirectPath = detailPath;

  try {
    const club = await updateClubApi(clubId, {
      name,
      description,
      status,
    });

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      clubUpdated: `${club.name} has been updated.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        clubUpdateError: getApiErrorMessage(error, "The club could not be updated right now."),
      })
    );
  }

  redirect(successRedirectPath);
}

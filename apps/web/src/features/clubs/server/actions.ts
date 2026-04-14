"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminApiHeaders } from "@/lib/api/adminAuthHeaders";
import {
  createClubApi,
  createClubManagerGrantApi,
  deleteClubManagerGrantApi,
  updateClubApi,
} from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getOptionalString, getRequiredString } from "@/lib/forms";

export async function createClubAction(formData: FormData) {
  const organizationId = getRequiredString(formData, "organizationId", "Organization ID");
  const name = getRequiredString(formData, "name", "Club name");
  const status = getRequiredString(formData, "status", "Club status");
  const description = getOptionalString(formData, "description") ?? "";
  let successRedirectPath = "/clubs";

  try {
    const club = await createClubApi(
      {
        organization_id: organizationId,
        name,
        description,
        status,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: "/clubs" }),
      }
    );

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
    const club = await updateClubApi(
      clubId,
      {
        name,
        description,
        status,
      },
      {
        headers: await getAdminApiHeaders({ includeCsrf: true, originPath: detailPath }),
      }
    );

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

export async function createClubManagerGrantAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const memberId = getRequiredString(formData, "memberId", "Member");
  const roleName = getRequiredString(formData, "roleName", "Manager title");
  const detailPath = `/clubs/${clubId}`;
  let successRedirectPath = detailPath;

  try {
    const grant = await createClubManagerGrantApi(clubId, {
      member_id: memberId,
      role_name: roleName,
    });

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      managerGrantCreated: `${grant.member_name} can now manage this club as ${grant.role_name}.`,
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        managerGrantError: getApiErrorMessage(
          error,
          "The club manager grant could not be created right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function deleteClubManagerGrantAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const grantId = getRequiredString(formData, "grantId", "Manager grant");
  const detailPath = `/clubs/${clubId}`;
  let successRedirectPath = detailPath;

  try {
    await deleteClubManagerGrantApi(clubId, grantId);

    revalidatePath("/clubs");
    revalidatePath(detailPath);
    revalidatePath("/dashboard");

    successRedirectPath = buildPathWithSearchParams(detailPath, {
      managerGrantDeleted: "Club manager access has been revoked.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(detailPath, {
        managerGrantError: getApiErrorMessage(
          error,
          "The club manager grant could not be removed right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

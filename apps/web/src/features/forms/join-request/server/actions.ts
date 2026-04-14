"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { approveJoinRequestApi, denyJoinRequestApi } from "@/lib/api/clubcrm";
import { getApiErrorMessage } from "@/lib/api/server-data";
import { buildPathWithSearchParams, getRequiredString } from "@/lib/forms";
import type { JoinRequestContext } from "@/features/forms/join-request/types";
import { getJoinRequestApiAuthHeaders } from "./authHeaders";

export type SubmissionState =
  | { status: "idle" }
  | { status: "success"; id: string }
  | { status: "error"; message: string };

const API_ORIGINS = [process.env.API_BASE_URL, "http://api:8000", "http://localhost:8000"].filter(
  (v): v is string => Boolean(v)
);

export async function submitJoinRequest(
  context: JoinRequestContext,
  _prev: SubmissionState,
  formData: FormData
): Promise<SubmissionState> {
  const submitterName = formData.get("submitter_name")?.toString().trim();
  const submitterEmail = formData.get("submitter_email")?.toString().trim();
  const studentId = formData.get("student_id")?.toString().trim() || undefined;
  const role = formData.get("role")?.toString().trim() || undefined;
  const message = formData.get("message")?.toString().trim() || undefined;

  if (!submitterName || !submitterEmail) {
    return { status: "error", message: "Name and email are required." };
  }

  for (const base of API_ORIGINS) {
    try {
      const res = await fetch(`${base}/forms/join-request/${context.clubId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: context.organizationId,
          submitter_name: submitterName,
          submitter_email: submitterEmail,
          student_id: studentId,
          role,
          message,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as { id: string; status: string };
        return { status: "success", id: json.id };
      }

      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      return { status: "error", message: err.detail ?? `Submission failed (${res.status}).` };
    } catch {
      continue;
    }
  }

  return { status: "error", message: "Could not reach the API." };
}

function buildJoinRequestSuccessMessage(result: {
  member_created: boolean;
  membership_created: boolean;
}): string {
  if (result.member_created) {
    return "Join request approved. A new member was created and added to the club.";
  }

  if (result.membership_created) {
    return "Join request approved. The existing member was added to the club.";
  }

  return "Join request approved. The member was already on this club roster.";
}

export async function approveJoinRequestAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const joinRequestId = getRequiredString(formData, "joinRequestId", "Join request");
  const role = getRequiredString(formData, "role", "Role");
  const redirectPath = `/clubs/${clubId}/join-requests`;
  let successRedirectPath = redirectPath;

  try {
    const result = await approveJoinRequestApi(
      joinRequestId,
      { role },
      {
        headers: await getJoinRequestApiAuthHeaders({
          includeCsrf: true,
          originPath: redirectPath,
        }),
      }
    );

    revalidatePath("/clubs");
    revalidatePath(`/clubs/${clubId}`);
    revalidatePath(redirectPath);
    revalidatePath("/members");
    revalidatePath(`/members/${result.member_id}`);

    successRedirectPath = buildPathWithSearchParams(redirectPath, {
      joinRequestUpdated: buildJoinRequestSuccessMessage(result),
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(redirectPath, {
        joinRequestError: getApiErrorMessage(
          error,
          "The join request could not be approved right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

export async function denyJoinRequestAction(formData: FormData) {
  const clubId = getRequiredString(formData, "clubId", "Club");
  const joinRequestId = getRequiredString(formData, "joinRequestId", "Join request");
  const redirectPath = `/clubs/${clubId}/join-requests`;
  let successRedirectPath = redirectPath;

  try {
    await denyJoinRequestApi(joinRequestId, {
      headers: await getJoinRequestApiAuthHeaders({
        includeCsrf: true,
        originPath: redirectPath,
      }),
    });

    revalidatePath(redirectPath);
    successRedirectPath = buildPathWithSearchParams(redirectPath, {
      joinRequestUpdated: "Join request denied.",
    });
  } catch (error) {
    redirect(
      buildPathWithSearchParams(redirectPath, {
        joinRequestError: getApiErrorMessage(
          error,
          "The join request could not be denied right now."
        ),
      })
    );
  }

  redirect(successRedirectPath);
}

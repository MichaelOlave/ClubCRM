"use server";
import type { JoinRequestContext } from "@/features/forms/join-request/types";

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

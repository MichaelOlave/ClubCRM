"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import type { ActionNotice as ActionNoticeModel } from "@/lib/forms";

type Props = {
  notice: ActionNoticeModel | null;
};

export function ActionNotice({ notice }: Props) {
  if (!notice) {
    return null;
  }

  return (
    <Alert variant={notice.kind === "success" ? "success" : "destructive"}>
      <AlertTitle>{notice.kind === "success" ? "Saved" : "Unable to save"}</AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}

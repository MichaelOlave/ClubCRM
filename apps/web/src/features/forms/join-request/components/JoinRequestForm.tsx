"use client";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Textarea } from "@/components/shadcn/textarea";
import {
  submitJoinRequest,
  type SubmissionState,
} from "@/features/forms/join-request/server/actions";
import type { JoinRequestContext } from "@/features/forms/join-request/types";
import { TEXT_LIMITS } from "@/lib/textLimits";

type Props = {
  context: JoinRequestContext;
};

export function JoinRequestForm({ context }: Props) {
  const boundAction = submitJoinRequest.bind(null, context);
  const [state, action, isPending] = useActionState<SubmissionState, FormData>(boundAction, {
    status: "idle",
  });
  const [role, setRole] = useState("");

  if (state.status === "success") {
    return (
      <div className="space-y-6">
        <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
            {context.organizationName}
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Request submitted
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Your join request for <strong>{context.clubName}</strong> has been received.
            </p>
            <p className="text-xs text-muted-foreground">Reference: {state.id}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
          {context.organizationName}
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Join {context.clubName}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {context.clubDescription}
          </p>
        </div>
      </Card>

      <Card className="space-y-5 rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Public join request</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            This route lives in the public group so prospective members can submit without logging
            into the admin UI.
          </p>
        </div>

        {state.status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form action={action} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Full name</span>
            <Input
              maxLength={TEXT_LIMITS.memberName}
              name="submitter_name"
              placeholder="Student name"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Email address</span>
            <Input
              maxLength={TEXT_LIMITS.email}
              name="submitter_email"
              placeholder="student@champlain.edu"
              type="email"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Student ID</span>
            <Input
              maxLength={TEXT_LIMITS.studentId}
              name="student_id"
              placeholder="Optional for first contact"
            />
          </label>
          <div className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>How would you like to help?</span>
            <input type="hidden" name="role" value={role} />
            <Select onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {context.roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 md:col-span-2">
            <span>Why this club?</span>
            <Textarea
              maxLength={TEXT_LIMITS.joinRequestMessage}
              name="message"
              placeholder={context.prompt}
            />
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Up to {TEXT_LIMITS.joinRequestMessage} characters.
            </span>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

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
import type { JoinRequestContext } from "@/features/forms/join-request/types";

type Props = {
  context: JoinRequestContext;
};

export function JoinRequestForm({ context }: Props) {
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

        <form className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Full name</span>
            <Input placeholder="Student name" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Email address</span>
            <Input placeholder="student@champlain.edu" type="email" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Student ID</span>
            <Input placeholder="Optional for first contact" />
          </label>
          <div className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>How would you like to help?</span>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {context.roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90 md:col-span-2">
            <span>Why this club?</span>
            <Textarea placeholder={context.prompt} />
          </label>
          <div className="md:col-span-2">
            <Button type="button">Submit request (UI preview)</Button>
          </div>
        </form>
      </Card>

      <Alert variant="warning">
        <AlertDescription>
          This page now pulls live club data from the API, but form submission is still a UI-only
          preview until the MongoDB workflow is connected.
        </AlertDescription>
      </Alert>
    </div>
  );
}

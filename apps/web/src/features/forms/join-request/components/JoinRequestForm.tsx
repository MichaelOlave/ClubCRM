import type { JoinRequestContext } from "@/features/forms/join-request/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";

type Props = {
  context: JoinRequestContext;
};

export function JoinRequestForm({ context }: Props) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
          {context.organizationName}
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Join {context.clubName}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
            {context.clubDescription}
          </p>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-zinc-950">Public join request</h2>
          <p className="text-sm leading-6 text-zinc-600">
            This route lives in the public group so prospective members can submit without logging
            into the admin UI.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2">
          <Input label="Full name" placeholder="Student name" />
          <Input label="Email address" placeholder="student@champlain.edu" type="email" />
          <Input label="Student ID" placeholder="Optional for first contact" />
          <Select defaultValue="" label="How would you like to help?">
            <option disabled value="">
              Select a role
            </option>
            {context.roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          <Textarea className="md:col-span-2" label="Why this club?" placeholder={context.prompt} />
          <div className="md:col-span-2">
            <Button type="button">Submit request (UI preview)</Button>
          </div>
        </form>
      </Card>

      <Toast tone="warning">
        This page is intentionally a frontend-first shell. The next slice will connect it to the
        MongoDB-backed form submission workflow.
      </Toast>
    </div>
  );
}

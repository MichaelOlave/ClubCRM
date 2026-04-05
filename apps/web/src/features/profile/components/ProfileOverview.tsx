import { Badge } from "@/components/shadcn/badge";
import { Card } from "@/components/shadcn/card";
import { TabsView } from "@/components/shadcn/tabs-view";
import type {
  ProfileCheck,
  ProfileCheckStatus,
  ProfileField,
  ProfileViewModel,
} from "@/features/profile/types";

type Props = {
  viewModel: ProfileViewModel;
};

function getCheckVariant(status: ProfileCheckStatus) {
  switch (status) {
    case "pass":
      return "success";
    case "warn":
      return "warning";
    case "fail":
      return "destructive";
    case "info":
      return "secondary";
  }
}

function DetailGrid({ fields }: { fields: ProfileField[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div
          className="rounded-[1.25rem] border border-border bg-muted/40 p-4 shadow-sm"
          key={field.label}
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {field.label}
          </p>
          <p
            className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground ${
              field.isCode ? "font-mono text-[13px]" : "font-semibold"
            }`}
          >
            {field.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{field.helperText}</p>
        </div>
      ))}
    </div>
  );
}

function SessionCheckList({ checks }: { checks: ProfileCheck[] }) {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div
          className="rounded-[1.25rem] border border-border bg-muted/30 p-4 shadow-sm"
          key={check.label}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{check.label}</p>
              <p className="text-sm leading-6 text-muted-foreground">{check.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={getCheckVariant(check.status)}>{check.status}</Badge>
              <p className="text-sm font-semibold text-foreground">{check.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileOverview({ viewModel }: Props) {
  const profile = (
    <div className="space-y-6">
      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-brand text-lg font-semibold text-brand-foreground shadow-sm">
              {viewModel.summary.initials}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
                Signed-in identity
              </p>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{viewModel.summary.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {viewModel.summary.email}
                </p>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {viewModel.summary.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {viewModel.summary.badges.map((badge) => (
              <Badge key={badge.label} variant={badge.tone}>
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Stored personal info</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            These fields mirror the user payload currently stored in the backend auth session. If a
            value is missing here, the current auth provider flow did not persist it.
          </p>
        </div>

        <div className="mt-6">
          <DetailGrid fields={viewModel.personalFields} />
        </div>
      </Card>
    </div>
  );

  const debug = (
    <div className="space-y-6">
      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Auth and session checks</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            These checks make the auth plumbing visible so you can confirm the protected route,
            backend session lookup, and cookie or CSRF alignment are all working together.
          </p>
        </div>

        <div className="mt-6">
          <SessionCheckList checks={viewModel.sessionChecks} />
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Request context</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            This captures the web-side request and environment details that influence the auth flow.
          </p>
        </div>

        <div className="mt-6">
          <DetailGrid fields={viewModel.requestFields} />
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Debug snapshot</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Masked raw data from the current request, useful when comparing what the web app sees to
            what the backend session endpoint returned.
          </p>
        </div>

        <pre className="mt-6 overflow-x-auto rounded-[1.25rem] border border-border bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {viewModel.debugSnapshot}
        </pre>
      </Card>
    </div>
  );

  return (
    <TabsView
      activeId="profile"
      tabs={[
        {
          id: "profile",
          label: "Profile",
          count: viewModel.personalFields.length,
          content: profile,
        },
        {
          id: "debug",
          label: "Debug",
          count: viewModel.sessionChecks.length,
          content: debug,
        },
      ]}
    />
  );
}

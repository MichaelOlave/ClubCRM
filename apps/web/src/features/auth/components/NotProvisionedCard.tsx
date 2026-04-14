import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { logout } from "@/features/auth/server/actions";
import type { LoginViewModel } from "@/features/auth/types";

export function NotProvisionedCard({
  endpointLabel,
  helperText,
  loginHref,
  statusMessage,
  statusTitle,
  user,
}: LoginViewModel) {
  return (
    <Card className="w-full max-w-lg rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
            Access required
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              ClubCRM access not provisioned
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">
              Your Auth0 sign-in succeeded, but this account does not currently have a ClubCRM
              organization-admin or club-manager grant.
            </p>
          </div>
        </div>

        <Alert variant="warning">
          <AlertTitle>{statusTitle}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{statusMessage}</p>
            {user ? (
              <p>
                Signed in as <span className="font-medium">{user.name ?? "ClubCRM user"}</span>
                {user.email ? ` (${user.email})` : ""}.
              </p>
            ) : null}
            <p className="text-xs opacity-80">Session check: {endpointLabel}</p>
          </AlertDescription>
        </Alert>

        <Alert variant="default">
          <AlertDescription>
            {helperText} If this account should already have access, confirm the email in Auth0
            matches the ClubCRM admin or club-member record that should grant it.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            className="bg-brand-emphasis text-slate-950 hover:bg-brand hover:text-slate-950"
            variant="secondary"
          >
            <a href={loginHref}>Refresh backend sign-in</a>
          </Button>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

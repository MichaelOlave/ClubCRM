import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { logout } from "@/features/auth/server/actions";
import type { LoginViewModel } from "@/features/auth/types";

const alertVariantByStatus = {
  authenticated: "success",
  "signed-out": "info",
  unavailable: "warning",
} as const;

export function LoginForm({
  description,
  endpointLabel,
  helperText,
  loginHref,
  status,
  statusMessage,
  statusTitle,
  title,
  user,
}: LoginViewModel) {
  const canAccessAdmin = status === "authenticated";

  return (
    <Card className="w-full max-w-lg rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">Public entry</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>

        <Alert variant={alertVariantByStatus[status]}>
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
          <AlertDescription>{helperText}</AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={loginHref}>
              {status === "authenticated" ? "Refresh backend sign-in" : "Continue to sign in"}
            </a>
          </Button>
          {canAccessAdmin ? (
            <Button asChild variant="secondary">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : null}
          {canAccessAdmin ? (
            <form action={logout}>
              <Button type="submit" variant="outline">
                Logout
              </Button>
            </form>
          ) : null}
          {canAccessAdmin ? (
            <Button asChild variant="ghost">
              <Link href="/system/health">View diagnostics</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

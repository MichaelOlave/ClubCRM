import Link from "next/link";
import { ArrowRight, LogOut, LayoutDashboard, UserCircle, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { logout } from "@/features/auth/server/actions";
import type { LoginViewModel } from "@/features/auth/types";
import { cn } from "@/lib/utils";

const alertVariantByStatus = {
  authorized: "success",
  "not-provisioned": "warning",
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
  const canAccessApp = status === "authorized";
  const canLogout = status === "authorized" || status === "not-provisioned";

  return (
    <Card className="mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] border-none bg-card/50 shadow-[0_32px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all hover:shadow-[0_40px_100px_rgba(15,23,42,0.12)]">
      <div className="relative h-1.5 bg-brand/10">
        <div
          className={cn(
            "h-full bg-brand transition-all duration-1000 ease-in-out",
            status === "authorized" ? "w-full" : "w-1/3"
          )}
        />
      </div>

      <CardHeader className="space-y-4 pb-2 pt-6 sm:pt-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-inner sm:h-14 sm:w-14">
            <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand/80 sm:text-xs">
              Identity Portal
            </p>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="text-pretty text-sm leading-relaxed text-muted-foreground/90">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        <Alert
          variant={alertVariantByStatus[status]}
          className="overflow-hidden border-none bg-opacity-10 shadow-sm transition-all"
        >
          <div className="flex flex-col gap-1">
            <AlertTitle className="flex items-center gap-2 font-bold">{statusTitle}</AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              <div className="rounded-xl bg-background/40 p-3 text-sm ring-1 ring-border/5 sm:p-4">
                <p className="font-medium text-foreground/90">{statusMessage}</p>
                {user ? (
                  <div className="mt-3 flex items-center gap-3 border-t border-border/10 pt-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand ring-4 ring-brand/5 sm:h-9 sm:w-9">
                      <UserCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        {user.name ?? "ClubCRM User"}
                      </p>
                      {user.email && (
                        <p className="truncate text-[10px] font-medium text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-widest opacity-50">
                <span>Session Node</span>
                <span className="font-mono">{endpointLabel}</span>
              </div>
            </AlertDescription>
          </div>
        </Alert>

        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/40">
          <p className="text-sm italic leading-relaxed text-muted-foreground/80">{helperText}</p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t border-border/10 bg-muted/5 p-4 pt-6 sm:p-8">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            asChild
            className="group h-12 rounded-xl bg-brand font-semibold text-slate-950 shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] hover:bg-brand-emphasis active:scale-[0.98]"
          >
            <a href={loginHref} className="flex items-center justify-center gap-2">
              <span>
                {status === "authorized" || status === "not-provisioned"
                  ? "Refresh Session"
                  : "Continue to Sign In"}
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>

          {canAccessApp && (
            <Button
              asChild
              variant="secondary"
              className="h-12 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link href="/dashboard" className="flex items-center justify-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Enter Dashboard</span>
              </Link>
            </Button>
          )}

          {canLogout && (
            <form action={logout} className={cn("w-full", !canAccessApp && "sm:col-span-2")}>
              <Button
                type="submit"
                variant="outline"
                className="h-12 w-full rounded-xl border-dashed font-semibold transition-all hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          )}

          {canAccessApp && (
            <Button asChild variant="ghost" className="h-12 rounded-xl font-semibold sm:col-span-2">
              <Link href="/profile" className="flex items-center justify-center gap-2">
                <UserCircle className="h-4 w-4" />
                <span>Manage Profile</span>
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

import Link from "next/link";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import type { LoginViewModel } from "@/features/auth/types";

export function LoginForm({ description, helperText, title }: LoginViewModel) {
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

        <form className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Email address</span>
            <Input autoComplete="email" placeholder="you@champlain.edu" type="email" />
            <span className="text-xs font-normal text-muted-foreground">
              Use your organization admin or club manager email.
            </span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground/90">
            <span>Password</span>
            <Input
              autoComplete="current-password"
              placeholder="Enter your password"
              type="password"
            />
            <span className="text-xs font-normal text-muted-foreground">
              Password auth will be wired once the backend auth module exists.
            </span>
          </label>
          <Button className="w-full" type="button">
            Continue
          </Button>
        </form>

        <Alert variant="warning">
          <AlertDescription>{helperText}</AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/dashboard">Open admin preview</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/system/health">View diagnostics</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

import type { LoginViewModel } from "@/features/auth/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

export function LoginForm({ description, helperText, title }: LoginViewModel) {
  return (
    <Card className="w-full max-w-lg">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
            Public entry
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
            <p className="text-sm leading-7 text-zinc-600">{description}</p>
          </div>
        </div>

        <form className="space-y-4">
          <Input
            autoComplete="email"
            hint="Use your organization admin or club manager email."
            label="Email address"
            placeholder="you@champlain.edu"
            type="email"
          />
          <Input
            autoComplete="current-password"
            hint="Password auth will be wired once the backend auth module exists."
            label="Password"
            placeholder="Enter your password"
            type="password"
          />
          <Button className="w-full" type="button">
            Continue
          </Button>
        </form>

        <Toast tone="warning">{helperText}</Toast>

        <div className="flex flex-wrap gap-3">
          <Button href="/dashboard" variant="secondary">
            Open admin preview
          </Button>
          <Button href="/system/health" variant="ghost">
            View diagnostics
          </Button>
        </div>
      </div>
    </Card>
  );
}

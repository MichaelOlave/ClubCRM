import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";

const bypassRoleLinks = [
  {
    description: "Jump into the full organization admin workspace with unrestricted app access.",
    href: "/api/auth/login?role=org_admin",
    label: "Sign in as admin",
  },
  {
    description: "Start a scoped session that behaves like a club manager.",
    href: "/api/auth/login?role=club_manager",
    label: "Sign in as club manager",
  },
] as const;

export function TestLoginForm() {
  return (
    <Card className="w-full max-w-3xl rounded-[1.5rem] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">
            Developer bypass
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Test login</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              <code>IS_AUTH_BYPASS</code> is enabled, so this page skips the external
              identity-provider handoff and lets you open a local test session for either supported
              ClubCRM role.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {bypassRoleLinks.map((option) => (
            <Card
              className="flex h-full flex-col justify-between rounded-[1.25rem] border bg-muted/30 p-5"
              key={option.href}
            >
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">{option.label}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{option.description}</p>
              </div>

              <Button
                asChild
                className="mt-6 bg-brand-emphasis text-slate-950 hover:bg-brand hover:text-slate-950"
                variant="secondary"
              >
                <a href={option.href}>{option.label}</a>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}

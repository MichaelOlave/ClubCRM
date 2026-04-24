import { ShieldAlert, Terminal, ArrowRight } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";

const bypassRoleLinks = [
  {
    description: "Jump into the full organization admin workspace with unrestricted app access.",
    href: "/api/auth/login?role=org_admin",
    label: "Sign in as admin",
    icon: ShieldAlert,
  },
  {
    description: "Start a scoped session that behaves like a club manager.",
    href: "/api/auth/login?role=club_manager",
    label: "Sign in as club manager",
    icon: Terminal,
  },
] as const;

export function TestLoginForm() {
  return (
    <Card className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border-none bg-card/50 shadow-[0_32px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <div className="relative h-1.5 bg-warning/20">
        <div className="h-full w-full bg-warning/40 animate-pulse" />
      </div>

      <CardHeader className="space-y-4 pb-2 pt-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning shadow-inner text-warning-solid">
            <Terminal className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-warning-foreground opacity-80">
              Developer Bypass
            </p>
            <CardTitle className="text-3xl font-bold tracking-tight">Test Login</CardTitle>
          </div>
        </div>
        <CardDescription className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground/90">
          <code className="rounded bg-warning/10 px-1.5 py-0.5 font-mono text-warning-foreground">
            IS_AUTH_BYPASS
          </code>{" "}
          is enabled. This environment skips external identity providers, allowing you to simulate
          local sessions for rapid development.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 p-8 md:grid-cols-2">
        {bypassRoleLinks.map((option) => (
          <Card
            className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border-none bg-background/40 p-6 shadow-sm transition-all hover:scale-[1.02] hover:bg-background/60 hover:shadow-md"
            key={option.href}
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                <option.icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{option.label}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  {option.description}
                </p>
              </div>
            </div>

            <Button
              asChild
              className="mt-8 h-11 w-full rounded-xl bg-brand font-semibold text-slate-950 transition-all hover:bg-brand-emphasis"
            >
              <a href={option.href} className="flex items-center justify-center gap-2">
                <span>{option.label}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

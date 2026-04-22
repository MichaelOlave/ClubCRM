"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/shadcn/button";

type Props = Readonly<{
  children: React.ReactNode;
  isAuthorized?: boolean;
}>;

export function PublicShell({ children, isAuthorized = false }: Props) {
  const pathname = usePathname();
  const isJoinRoute = pathname?.startsWith("/join/") ?? false;
  const authActionHref = isJoinRoute && isAuthorized ? "/dashboard" : "/login";
  const authActionLabel = isJoinRoute && isAuthorized ? "Back to dashboard" : "Sign in";
  const authActionVariant = isJoinRoute && isAuthorized ? "secondary" : "default";
  const authActionClassName =
    isJoinRoute && isAuthorized
      ? undefined
      : "border-brand-border bg-brand-surface text-brand-foreground hover:bg-brand-border";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,var(--app-gradient-start),var(--app-gradient-mid)_30%,var(--app-gradient-end)_72%)] px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-card/85 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand">ClubCRM</p>
            <div>
              <Link className="text-2xl font-semibold tracking-tight text-foreground" href="/">
                Public entry points
              </Link>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Login stays public for admins, and club join forms stay public for prospective
                members.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/testing">Tester guide</Link>
            </Button>
            <Button asChild className={authActionClassName} variant={authActionVariant}>
              <Link href={authActionHref}>{authActionLabel}</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

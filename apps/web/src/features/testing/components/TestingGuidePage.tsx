import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";

const readinessChecks = [
  "Use the latest Chrome, Edge, or Safari build and keep the browser window wide enough to test both desktop and mobile layouts.",
  "Start from a clean session when possible so you can confirm the login flow, redirects, and role-based navigation.",
  "Capture screenshots and exact repro steps for anything unexpected, including the URL, the action you took, and what you expected to happen.",
];

const testAreas = [
  {
    title: "Access and sign in",
    description:
      "Open the login page first, confirm the page renders cleanly, and verify sign-in or the test-login bypass behaves the way the team expects.",
    checks: [
      "Go to `/login` and confirm the page loads without layout shifts, missing styles, or obvious errors.",
      "Sign in with the test credentials or approved bypass flow for your test pass.",
      "Verify authorized users land inside the admin workspace after a successful sign in.",
      "If you are testing access limits, confirm non-provisioned users land on `/not-provisioned` instead of a broken state.",
    ],
  },
  {
    title: "Admin workspace",
    description:
      "After sign in, move through the main admin pages in order and confirm navigation, tables, and page-level actions feel stable.",
    checks: [
      "Open Dashboard and confirm the overview loads with no empty or broken sections.",
      "Open Profile, then Clubs, then Members, then Audit, then System Health.",
      "If test data is available, open at least one club detail page and one member detail page.",
      "On each page, check that buttons, dialogs, tables, and badges stay readable on both large and small screens.",
    ],
  },
  {
    title: "Public club flows",
    description:
      "Use the shared public links from the team after the admin pass so you can verify the non-admin experience still works for prospective members.",
    checks: [
      "Open at least one `/join/[clubId]` link and confirm the public form is reachable without admin auth.",
      "Check that the public page looks polished and does not expose admin-only controls.",
      "If the form is interactive in your environment, step through the inputs and confirm labels, validation, and submission affordances make sense.",
      "Repeat the page check at a narrower browser width to confirm the public flow still feels complete on mobile.",
    ],
  },
  {
    title: "Networking demo only",
    description:
      "This area is separate from the normal product walkthrough and is only needed when you are helping with the networking presentation or failover testing.",
    checks: [
      "Open `/demo/failover` only if your test pass includes the networking demo.",
      "Confirm the monitor loads without sign-in and continues updating during the presentation.",
      "If you notice demo issues, report them separately from the main app flow so the team can route them correctly.",
    ],
  },
];

const walkthroughSteps = [
  "Open this tester landing page and read the readiness checks before you begin.",
  "Start at `/login` and complete a normal sign-in or approved test-login flow.",
  "Verify where you land after sign in: admin users should reach the workspace, while non-provisioned users should reach `/not-provisioned`.",
  "Inside the admin workspace, visit Dashboard, Profile, Clubs, Members, Audit, and System Health in that order.",
  "Open at least one club and one member detail screen if the environment has test data.",
  "Switch to a narrower browser width and quickly repeat the core pages to catch layout issues.",
  "Open a shared `/join/[clubId]` link and check the public member flow without admin auth.",
  "Only if assigned, open `/demo/failover` and verify the networking demo monitor keeps updating.",
  "Report anything unexpected with the URL, exact actions, expected result, and actual result.",
];

const reportingChecklist = [
  "What environment you used, including browser and whether you were on desktop or mobile.",
  "The exact page URL and the sequence of clicks or form actions.",
  "What happened, what you expected, and whether the issue is blocking, confusing, or cosmetic.",
];

export function TestingGuidePage() {
  return (
    <section className="w-full max-w-6xl">
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden rounded-[1.75rem] border-border bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <CardHeader className="gap-4 border-b border-border/80 bg-[linear-gradient(135deg,var(--brand-surface),transparent_65%)] pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="secondary"
                className="rounded-full px-4 py-1 text-[0.7rem] uppercase tracking-[0.24em]"
              >
                Testing instructions
              </Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1">
                Public route
              </Badge>
            </div>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                ClubCRM tester landing page
              </CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7 text-muted-foreground">
                Use this page as your quick briefing before you start a test pass. It outlines the
                most important product areas to cover and the level of detail that helps the team
                reproduce issues quickly.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link href="/login">Start with sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/demo/failover">Open networking demo</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {readinessChecks.map((item, index) => (
                <div
                  key={item}
                  className="rounded-3xl border border-border/80 bg-background/80 p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                    Step {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Step-by-step walkthrough</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Use this sequence if you want explicit instructions for a standard tester pass.
                </p>
              </div>

              <ol className="grid gap-4">
                {walkthroughSteps.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-4 rounded-3xl border border-border/80 bg-background/80 p-5 shadow-sm"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Detailed area checklist</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Use the area-by-area notes below if you want extra coverage after the core
                  walkthrough.
                </p>
              </div>

              <div className="grid gap-4">
                {testAreas.map((area, index) => (
                  <Card key={area.title} className="rounded-3xl border-border/80 bg-background/70">
                    <CardHeader className="gap-3 pb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="muted" className="rounded-full px-3 py-1">
                          Area {index + 1}
                        </Badge>
                        <CardTitle className="text-xl">{area.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm leading-6">
                        {area.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-3 text-sm leading-6 text-foreground">
                        {area.checks.map((check) => (
                          <li key={check} className="flex gap-3">
                            <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-emphasis" />
                            <span>{check}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card className="rounded-[1.75rem] border-border bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <Badge variant="warning" className="w-fit rounded-full px-4 py-1">
                Before you report
              </Badge>
              <CardTitle className="text-2xl">Bug report essentials</CardTitle>
              <CardDescription className="text-sm leading-6">
                A short, specific report helps the team fix issues much faster than a vague summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportingChecklist.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm leading-6 text-foreground"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-border bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <Badge variant="success" className="w-fit rounded-full px-4 py-1">
                Quick links
              </Badge>
              <CardTitle className="text-2xl">Tester shortcuts</CardTitle>
              <CardDescription className="text-sm leading-6">
                Use these links during a smoke test when you want to move quickly through the main
                public and admin entry points.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild variant="secondary" className="justify-start">
                <Link href="/login">Admin sign in</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/not-provisioned">Not-provisioned state</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/demo/failover">Networking demo route</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

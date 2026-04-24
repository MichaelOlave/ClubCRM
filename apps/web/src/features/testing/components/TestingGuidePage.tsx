"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  ListChecks,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";

const readinessChecks = [
  {
    title: "Environment",
    description: "Use the latest Chrome, Edge, or Safari build. Test both desktop and mobile.",
    icon: <Activity className="size-5 text-brand" />,
  },
  {
    title: "Clean Session",
    description: "Start from a clean session to confirm login flow and role-based navigation.",
    icon: <ShieldCheck className="size-5 text-brand" />,
  },
  {
    title: "Documentation",
    description: "Capture screenshots and exact repro steps for anything unexpected.",
    icon: <Bug className="size-5 text-brand" />,
  },
];

const testAreas = [
  {
    title: "Access and sign in",
    icon: <ShieldCheck className="size-5" />,
    description:
      "Open the login page first, confirm the page renders cleanly, and verify sign-in behavior.",
    checks: [
      "Go to `/login` and confirm no layout shifts or obvious errors.",
      "Sign in with the test credentials or approved bypass flow.",
      "Verify authorized users land inside the admin workspace.",
      "Confirm non-provisioned users land on `/not-provisioned`.",
    ],
  },
  {
    title: "Admin workspace",
    icon: <Activity className="size-5" />,
    description: "Move through the main admin pages and confirm navigation and tables feel stable.",
    checks: [
      "Open Dashboard and confirm overview loads without broken sections.",
      "Visit Profile, Clubs, Members, Audit, and System Health.",
      "Open at least one club detail page and one member detail page.",
      "Verify responsiveness on both large and small screens.",
    ],
  },
  {
    title: "Public club flows",
    icon: <Search className="size-5" />,
    description: "Verify the non-admin experience still works for prospective members.",
    checks: [
      "Open a `/join/[clubId]` link without admin authentication.",
      "Ensure public pages look polished and hide admin controls.",
      "Step through inputs and confirm labels and validation.",
      "Repeat the check at a narrower width for mobile responsiveness.",
    ],
  },
  {
    title: "Networking demo",
    icon: <Activity className="size-5 text-warning" />,
    description: "Only needed when helping with networking presentation or failover testing.",
    checks: [
      "Open `/demo/failover` only if assigned to networking tests.",
      "Confirm the monitor loads and continues updating.",
      "Report demo issues separately from main application bugs.",
    ],
  },
];

const walkthroughSteps = [
  "Read the readiness checks and prepare your browser environment.",
  "Start at `/login` and complete a normal sign-in flow.",
  "Confirm landing: admins to workspace, others to `/not-provisioned`.",
  "In workspace, visit Dashboard, Profile, Clubs, Members, Audit, and Health.",
  "Drill down into at least one club and one member detail screen.",
  "Switch to mobile view and repeat core navigation checks.",
  "Open a public `/join/[clubId]` link without being signed in.",
  "If assigned, verify the `/demo/failover` monitor keeps updating.",
  "Report bugs with URL, exact actions, and screenshots.",
];

const reportingChecklist = [
  "Environment details (Browser, OS, Screen size).",
  "The exact page URL and sequence of actions.",
  "Actual result vs. expected behavior.",
];

export function TestingGuidePage() {
  const [activeTab, setActiveTab] = React.useState("prep");

  return (
    <section className="w-full max-w-6xl space-y-8 pb-12">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/50 p-8 shadow-sm sm:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 size-64 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 size-64 rounded-full bg-brand/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="secondary"
                className="rounded-full bg-brand/10 px-4 py-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-brand"
              >
                Tester Guild
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/60 bg-background/50 px-4 py-1 backdrop-blur-sm"
              >
                Mission Briefing
              </Badge>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Ready for deployment?
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Your mission is to ensure ClubCRM remains bulletproof. Use this guide to navigate
                the application and report any anomalies you encounter.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl bg-brand px-8 text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/login" className="flex items-center gap-2">
                Start Test Pass <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/30 p-1">
              <TabsTrigger value="prep" className="rounded-xl data-[state=active]:shadow-sm">
                <CheckCircle2 className="size-4" /> Prep
              </TabsTrigger>
              <TabsTrigger value="walkthrough" className="rounded-xl data-[state=active]:shadow-sm">
                <ListChecks className="size-4" /> Walkthrough
              </TabsTrigger>
              <TabsTrigger value="deepdive" className="rounded-xl data-[state=active]:shadow-sm">
                <Search className="size-4" /> Deep Dive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prep" className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {readinessChecks.map((item) => (
                  <Card
                    key={item.title}
                    className="rounded-[2rem] border-border/60 bg-card/30 transition-colors hover:bg-card/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-brand/10">
                        {item.icon}
                      </div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert className="rounded-[2rem] border-brand/20 bg-brand/[0.02] p-6">
                <Info className="size-5 text-brand" />
                <AlertTitle className="ml-2 text-lg font-semibold text-brand">
                  Pro-tip for Testers
                </AlertTitle>
                <AlertDescription className="ml-2 mt-2">
                  Keep the browser console open (F12) while testing. If you see red errors, take a
                  screenshot of the console too! It helps us find the root cause in seconds.
                </AlertDescription>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("walkthrough")}
                    className="rounded-xl border-brand/20 text-brand hover:bg-brand/10"
                  >
                    Continue to Walkthrough <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              </Alert>
            </TabsContent>

            <TabsContent value="walkthrough" className="mt-6 space-y-6">
              <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-card/30">
                <CardHeader className="border-b border-border/40 bg-muted/20">
                  <CardTitle>Standard Operating Procedure</CardTitle>
                  <CardDescription>
                    Follow these steps for a complete application audit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ol className="divide-y divide-border/40">
                    {walkthroughSteps.map((step, index) => (
                      <li
                        key={index}
                        className="flex gap-4 p-5 transition-colors hover:bg-muted/30"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-foreground">{step}</p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setActiveTab("prep")} className="rounded-xl">
                  Back to Prep
                </Button>
                <Button
                  onClick={() => setActiveTab("deepdive")}
                  className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  Continue to Deep Dive <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="deepdive" className="mt-6 space-y-6">
              <div className="grid gap-4">
                {testAreas.map((area, index) => (
                  <Card key={area.title} className="rounded-[2rem] border-border/60 bg-card/30">
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                        {area.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{area.title}</CardTitle>
                          <Badge variant="muted" className="text-[10px] uppercase">
                            Area {index + 1}
                          </Badge>
                        </div>
                        <CardDescription>{area.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {area.checks.map((check, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-xl bg-background/50 p-3 text-sm leading-relaxed"
                          >
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand/40" />
                            <span>{check}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("walkthrough")}
                  className="rounded-xl"
                >
                  Back to Walkthrough
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border-warning/20 bg-warning/[0.02]">
            <CardHeader className="pb-4">
              <Badge variant="warning" className="w-fit rounded-full px-4 py-1">
                Bug Protocol
              </Badge>
              <CardTitle className="text-xl">Essential Info</CardTitle>
              <CardDescription>Help us fix it faster by including:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportingChecklist.map((item, i) => (
                <Alert
                  key={i}
                  variant="warning"
                  className="rounded-2xl border-none bg-background/80 py-3"
                >
                  <AlertCircle className="size-4 shrink-0" />
                  <AlertDescription className="ml-2">{item}</AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-border/60 bg-card/30">
            <CardHeader>
              <Badge variant="success" className="w-fit rounded-full px-4 py-1">
                Extraction
              </Badge>
              <CardTitle className="text-xl">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                asChild
                variant="outline"
                className="h-12 justify-between rounded-xl px-4 text-left font-normal"
              >
                <Link href="/login">
                  Admin Workspace <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 justify-between rounded-xl px-4 text-left font-normal"
              >
                <Link href="/not-provisioned">
                  Not-provisioned <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 justify-between rounded-xl px-4 text-left font-normal"
              >
                <Link href="/demo/failover">
                  Networking Demo <ExternalLink className="size-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

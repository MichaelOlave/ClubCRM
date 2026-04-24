"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  Users, 
  Shield, 
  Zap, 
  Megaphone, 
  Tent,
  ExternalLink,
  Menu,
  X,
  ArrowRight
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { ModeToggle } from "@/components/mode-toggle";

export function LandingPage({ isAuthorized = false }: { isAuthorized?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authActionHref = isAuthorized ? "/dashboard" : "/login";
  const authActionLabel = isAuthorized ? "Dashboard" : "Get Started";
  const authSignInLabel = isAuthorized ? "Go to Dashboard" : "Sign In";

  const features = [
    {
      title: "Multi-Club Management",
      description: "Manage multiple clubs under one organization with dedicated control panels for each.",
      icon: Tent,
    },
    {
      title: "Member Rosters",
      description: "Comprehensive member directories with customizable roles (Manager, Member) and status tracking.",
      icon: Users,
    },
    {
      title: "Announcements & Events",
      description: "Keep your community informed with integrated announcement boards and event scheduling.",
      icon: Megaphone,
    },
    {
      title: "Public Join Forms",
      description: "Automated onboarding with public-facing registration forms for prospective members.",
      icon: ExternalLink,
    },
    {
      title: "Audit & Diagnostics",
      description: "Real-time system health monitoring and comprehensive audit logs for all administrative actions.",
      icon: Shield,
    },
    {
      title: "Enterprise Architecture",
      description: "Built on a robust stack including FastAPI, PostgreSQL, MongoDB, and Redis for maximum reliability.",
      icon: Zap,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white border border-border shadow-sm">
              <Image src="/favicon.ico" alt="ClubCRM Logo" width={48} height={48} className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">ClubCRM</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-muted-foreground hover:text-brand transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-brand transition-colors">How it Works</Link>
            <div className="h-4 w-[1px] bg-border/60" />
            <ModeToggle />
            <Button asChild variant="ghost" className="text-sm font-semibold text-muted-foreground hover:text-brand hover:bg-brand/5">
              <Link href={authActionHref}>{authSignInLabel}</Link>
            </Button>
            <Button asChild className="bg-brand hover:bg-brand-emphasis text-white shadow-lg shadow-brand/20 rounded-full px-8 h-12">
              <Link href={authActionHref}>{authActionLabel}</Link>
            </Button>
          </nav>

          {/* Mobile Nav Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <ModeToggle />
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-foreground"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-b bg-background px-4 py-4 space-y-4">
            <Link href="#features" className="block text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>Features</Link>
            <Link href="#how-it-works" className="block text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>How it Works</Link>
            <div className="pt-2 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-center">
                <Link href={authActionHref}>{authSignInLabel}</Link>
              </Button>
              <Button asChild className="w-full justify-center bg-brand text-white">
                <Link href={authActionHref}>{authActionLabel}</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-40">
          {/* Animated Background Blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px] animate-float" />
            <div className="absolute top-[-5%] right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-brand-emphasis/10 blur-[100px] animate-float-delayed" />
          </div>
          
          <div className="container relative z-10 mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-sm font-medium text-brand mb-6 dark:border-brand-border dark:bg-brand-surface dark:text-brand-foreground">
              <span className="flex h-2 w-2 rounded-full bg-brand mr-2" />
              Now in Private Beta
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl mb-6 text-foreground">
              Elevate Your Club <br />
              <span className="text-brand">Management</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl mb-10">
              The open-source platform for managing multiple clubs, member rosters, and community engagement. Built with a high-performance FastAPI backend and modern Next.js frontend.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-brand hover:bg-brand-emphasis text-white text-base rounded-full shadow-lg shadow-brand/20">
                <Link href={authActionHref} className="flex items-center gap-2">
                  {authActionLabel} for Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full border-brand/20 hover:bg-brand/5 text-foreground">
                <Link href="#features">View Features</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30 dark:bg-muted/10 border-y border-border/50">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful tools designed specifically for club administrators and organizers to streamline operations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <Card key={idx} className="border border-border/50 bg-background shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
                  <CardHeader>
                    <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-brand/10 text-brand mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8 text-foreground">Built for Efficiency</h2>
                <div className="space-y-10">
                  <div className="flex gap-5 group">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/20 transition-transform group-hover:scale-110">1</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-foreground">Register Your Club</h3>
                      <p className="text-muted-foreground leading-relaxed">Define your club details, management team, and roster structure in seconds.</p>
                    </div>
                  </div>
                  <div className="flex gap-5 group">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/20 transition-transform group-hover:scale-110">2</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-foreground">Onboard Members</h3>
                      <p className="text-muted-foreground leading-relaxed">Manage roles, membership status, and comprehensive member profiles through the directory.</p>
                    </div>
                  </div>
                  <div className="flex gap-5 group">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/20 transition-transform group-hover:scale-110">3</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-foreground">Engage Your Community</h3>
                      <p className="text-muted-foreground leading-relaxed">Publish announcements and schedule events that sync across your club roster instantly.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-brand/5 rounded-[2.5rem] -rotate-1 dark:bg-brand/10" />
                <div className="relative aspect-video rounded-2xl bg-gradient-to-tr from-brand to-brand-emphasis/50 shadow-2xl flex items-center justify-center overflow-hidden border border-white/20">
                  <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                  <div className="relative z-10 opacity-40 dark:opacity-20">
                    <Megaphone className="h-32 w-32 text-brand-emphasis dark:text-white" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-2xl text-foreground">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-brand">Live Activity Feed</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                          <Megaphone className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">Annual Board Meeting</p>
                          <p className="text-xs text-muted-foreground">Announcement • Published just now</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                          <Tent className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">New Member Onboarding</p>
                          <p className="text-xs text-muted-foreground">Member Roster • Updated 2 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="rounded-[3rem] bg-gradient-to-br from-brand to-brand-emphasis px-6 py-16 text-center text-white shadow-2xl shadow-brand/30 sm:px-12 md:py-24 relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-surface/20 rounded-full -ml-48 -mb-48 blur-3xl opacity-50" />
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6">Ready to manage your club?</h2>
                <p className="text-lg text-white/90 mb-10 leading-relaxed">
                  Join the ClubCRM private beta or self-host your own instance today. Experience the modern way to lead your community.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" className="h-14 px-10 bg-white text-brand hover:bg-white/90 text-lg font-bold rounded-full shadow-xl transition-all hover:scale-105 active:scale-95">
                    <Link href={authActionHref}>{authActionLabel} Now</Link>
                  </Button>
                  <Button variant="ghost" size="lg" className="h-14 px-10 border border-white/40 text-white hover:bg-white/10 text-lg rounded-full backdrop-blur-sm transition-all hover:border-white/60">
                    <Link href="/login">Schedule a Demo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16 bg-muted/20 dark:bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white border border-border shadow-sm">
                  <Image src="/favicon.ico" alt="ClubCRM Logo" width={48} height={48} className="h-full w-full object-cover" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-foreground">ClubCRM</span>
              </div>
              <p className="text-muted-foreground max-w-xs mb-8 leading-relaxed">
                The open-source way to manage your club or community. Efficient, secure, and user-friendly.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-foreground uppercase text-xs tracking-[0.2em]">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-brand transition-colors">Features</Link></li>
                <li><Link href="/docs" className="hover:text-brand transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-foreground uppercase text-xs tracking-[0.2em]">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-brand transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-foreground uppercase text-xs tracking-[0.2em]">Legal</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-brand transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-brand transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground font-medium">
              © {new Date().getFullYear()} ClubCRM. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <Link href="#" className="text-xs font-semibold text-muted-foreground hover:text-brand transition-colors">Twitter</Link>
              <Link href="#" className="text-xs font-semibold text-muted-foreground hover:text-brand transition-colors">GitHub</Link>
              <Link href="#" className="text-xs font-semibold text-muted-foreground hover:text-brand transition-colors">LinkedIn</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

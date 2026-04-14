"use client";

import Link from "next/link";
import { Building2, Users, Wrench, BarChart3, Globe, ShieldCheck, Zap, Star, ChevronRight, Home, Calendar } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";

const DEMO_ROLES = [
  {
    role: "superadmin",
    label: "Super Admin",
    sublabel: "Full platform control",
    icon: ShieldCheck,
    accent: "border-violet-500/40 hover:border-violet-400/60 hover:bg-violet-500/10",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-300",
    dot: "bg-violet-400",
    href: "/auth/signin?demo=1&role=superadmin",
  },
  {
    role: "manager",
    label: "PM Manager",
    sublabel: "Properties & tenants",
    icon: Building2,
    accent: "border-cyan-500/40 hover:border-cyan-400/60 hover:bg-cyan-500/10",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-300",
    dot: "bg-cyan-400",
    href: "/auth/signin?demo=1&role=manager",
  },
  {
    role: "owner",
    label: "Owner",
    sublabel: "Portfolio & income",
    icon: Home,
    accent: "border-emerald-500/40 hover:border-emerald-400/60 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-300",
    dot: "bg-emerald-400",
    href: "/auth/signin?demo=1&role=owner",
  },
  {
    role: "tenant",
    label: "Tenant",
    sublabel: "Rent & requests",
    icon: Users,
    accent: "border-amber-500/40 hover:border-amber-400/60 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-300",
    dot: "bg-amber-400",
    href: "/auth/signin?demo=1&role=tenant",
  },
];

const FEATURES = [
  { icon: Building2, title: "Portfolio Management", description: "Manage properties, units, leases, and tenants from one dashboard." },
  { icon: Wrench, title: "Maintenance Tracking", description: "Submit, assign, and track maintenance requests in real time." },
  { icon: BarChart3, title: "Financial Reporting", description: "Automated rent collection, expense tracking, and reports." },
  { icon: Globe, title: "9-Language Support", description: "English, Spanish, French, German, Italian, Chinese, Japanese, Filipino, Russian." },
  { icon: Zap, title: "AI-Assisted Workflows", description: "Intelligent automation for leases, communications, and operations." },
  { icon: Star, title: "35 VMS Florida Properties", description: "Real VMS Florida vacation rentals integrated within the platform." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950">
      {/* Static gradient background — works everywhere, no video z-index issues */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950/80 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_80%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 py-4">
        <Link href="/" className="flex items-center gap-2.5 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-light.svg"
            alt="SmartStartPM"
            width={120}
            height={32}
            className="h-7 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" align="right" ghost onDarkBackdrop />
          <Link
            href="/auth/signin"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/[0.18] hover:border-white/35"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main — single screen layout: hero + demo cards together */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-10" style={{ minHeight: "calc(100vh - 64px)" }}>

        {/* Hero headline */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs tracking-wide text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Naples, Florida — Enterprise Property Management
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight"
            style={{ fontWeight: 200 }}
          >
            Modern Property{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm text-white/50 leading-relaxed" style={{ fontWeight: 300 }}>
            Enterprise-grade software for owners, managers, and tenants — with AI-assisted workflows and per-property pricing.
          </p>
        </div>

        {/* Demo Role Cards */}
        <div className="w-full max-w-2xl space-y-3 mb-8">
          <p className="text-center text-[10px] font-medium tracking-widest text-white/35 uppercase">
            Try a live demo — one click, no account needed
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEMO_ROLES.map(({ role, label, sublabel, icon: Icon, accent, iconBg, iconColor, dot, href }) => (
              <a
                key={role}
                href={href}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-2xl border bg-white/[0.05] p-4 text-center backdrop-blur-xl transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]",
                  accent
                )}
              >
                <div className={cn("rounded-xl p-2.5", iconBg)}>
                  <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-white/45 mt-0.5" style={{ fontWeight: 300 }}>{sublabel}</p>
                </div>
                <div className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                <div className="absolute inset-x-3 bottom-2 flex items-center justify-center gap-0.5 text-[10px] text-white/25 group-hover:text-white/60 transition-colors">
                  <span>Login</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signin"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/90 px-5 text-xs font-semibold text-slate-900 shadow-lg transition hover:bg-white"
          >
            Sign In with Credentials
          </Link>
          <Link
            href="/rentals"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-xs font-medium text-white/70 transition hover:bg-white/[0.12] hover:text-white"
          >
            <Home className="h-3.5 w-3.5" />
            Browse Rentals
          </Link>
          <Link
            href="/all-in-one-calendar"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-xs font-medium text-white/70 transition hover:bg-white/[0.12] hover:text-white"
          >
            <Calendar className="h-3.5 w-3.5" />
            Availability
          </Link>
        </div>
      </main>

      {/* Features section */}
      <section className="relative z-10 px-4 sm:px-8 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-light text-white/80 mb-8">Platform Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] hover:border-white/[0.16] transition"
              >
                <div className="shrink-0 rounded-lg bg-white/10 p-2 h-fit">
                  <Icon className="h-4 w-4 text-white/60" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white mb-0.5">{title}</h3>
                  <p className="text-[11px] text-white/45 leading-relaxed" style={{ fontWeight: 300 }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] px-4 sm:px-8 py-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25" style={{ fontWeight: 300 }} suppressHydrationWarning>
            © {new Date().getFullYear()} SmartStart PM · Naples, Florida
          </p>
          <div className="flex items-center gap-5 text-xs text-white/30">
            <Link href="/rentals" className="hover:text-white/60 transition-colors">Rentals</Link>
            <Link href="/all-in-one-calendar" className="hover:text-white/60 transition-colors">Calendar</Link>
            <Link href="/auth/signin" className="hover:text-white/60 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

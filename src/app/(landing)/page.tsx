"use client";

import Link from "next/link";
import { Building2, Users, Wrench, BarChart3, Globe, ShieldCheck, Zap, Star, ChevronRight, Home, Calendar, ArrowRight } from "lucide-react";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";

const DEMO_ROLES = [
  {
    role: "superadmin",
    label: "Super Admin",
    description: "Full platform control — manage all portfolios, users, billing, and system settings.",
    icon: ShieldCheck,
    color: "from-violet-600/20 to-purple-600/10 border-violet-500/30 hover:border-violet-400/50",
    badge: "bg-violet-500/20 text-violet-200 border-violet-400/30",
    iconColor: "text-violet-300",
    href: "/auth/signin?demo=1&role=superadmin",
  },
  {
    role: "manager",
    label: "Property Manager",
    description: "Oversee properties, tenants, leases, maintenance requests, and financial reports.",
    icon: Building2,
    color: "from-cyan-600/20 to-sky-600/10 border-cyan-500/30 hover:border-cyan-400/50",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
    iconColor: "text-cyan-300",
    href: "/auth/signin?demo=1&role=manager",
  },
  {
    role: "owner",
    label: "Property Owner",
    description: "Track your portfolio performance, view lease agreements, and monitor rental income.",
    icon: Home,
    color: "from-emerald-600/20 to-teal-600/10 border-emerald-500/30 hover:border-emerald-400/50",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    iconColor: "text-emerald-300",
    href: "/auth/signin?demo=1&role=owner",
  },
  {
    role: "tenant",
    label: "Tenant",
    description: "Pay rent, submit maintenance requests, review your lease, and communicate with management.",
    icon: Users,
    color: "from-amber-600/20 to-orange-600/10 border-amber-500/30 hover:border-amber-400/50",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    iconColor: "text-amber-300",
    href: "/auth/signin?demo=1&role=tenant",
  },
];

const FEATURES = [
  {
    icon: Building2,
    title: "Portfolio Management",
    description: "Manage all your properties, units, leases, and tenants from a single unified dashboard.",
  },
  {
    icon: Wrench,
    title: "Maintenance Tracking",
    description: "Submit, assign, and track maintenance requests with real-time status updates.",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    description: "Automated rent collection, expense tracking, and comprehensive financial reports.",
  },
  {
    icon: Globe,
    title: "9-Language Support",
    description: "Full localization in English, Spanish, French, German, Italian, Chinese, Japanese, Filipino, and Russian.",
  },
  {
    icon: Zap,
    title: "AI-Assisted Workflows",
    description: "Intelligent automation for lease renewals, communication, and operational tasks.",
  },
  {
    icon: Star,
    title: "VMS Florida Properties",
    description: "35 real VMS Florida vacation rental listings integrated and managed within the platform.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <HeroVideo />

      {/* Multi-layer overlay for readability */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,6,23,0.70) 0%, rgba(2,6,23,0.48) 35%, rgba(2,6,23,0.78) 75%, rgba(2,6,23,0.95) 100%)",
        }}
        aria-hidden
      />

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-light.svg"
            alt="SmartStartPM"
            width={140}
            height={36}
            className="h-8 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-base font-semibold text-white/90 hidden sm:inline">SmartStart PM</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" align="right" ghost onDarkBackdrop />
          <Link
            href="/auth/signin"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/18 hover:border-white/35"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-8 pb-16 pt-24 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs tracking-wide text-white/60 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Naples, Florida — Enterprise Property Management
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] tracking-tight"
              style={{ fontWeight: 200 }}
            >
              Modern Property
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent font-light">
                Management, Simplified
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-base text-white/55 leading-relaxed" style={{ fontWeight: 300 }}>
              Enterprise-grade software for owners, managers, and tenants. Economical per-property pricing, AI-assisted workflows, and seamless migration from legacy tools.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/auth/signin"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/rentals"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/16 hover:border-white/35"
              >
                <Home className="h-4 w-4" />
                Browse Rentals
              </Link>
              <Link
                href="/all-in-one-calendar"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/16 hover:border-white/35"
              >
                <Calendar className="h-4 w-4" />
                Check Availability
              </Link>
            </div>
          </div>
        </section>

        {/* ── Demo Login Section ── */}
        <section className="px-4 sm:px-8 pb-24">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl sm:text-3xl text-white" style={{ fontWeight: 200 }}>
                Try a Live Demo
              </h2>
              <p className="text-sm text-white/45" style={{ fontWeight: 300 }}>
                Log in instantly as any role — no account needed
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEMO_ROLES.map(({ role, label, description, icon: Icon, color, badge, iconColor, href }) => (
                <a
                  key={role}
                  href={href}
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-xl transition-all duration-300",
                    "hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
                    color
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className={cn("rounded-xl bg-white/10 p-2.5", iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide", badge)}>
                      Demo
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-white">{label}</h3>
                    <p className="text-xs text-white/55 leading-relaxed" style={{ fontWeight: 300 }}>
                      {description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white/70 transition-colors mt-auto pt-1">
                    <span>Try now</span>
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="px-4 sm:px-8 pb-28">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl text-white" style={{ fontWeight: 200 }}>
                Everything You Need
              </h2>
              <p className="text-sm text-white/45" style={{ fontWeight: 300 }}>
                A complete platform built for modern property management
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md transition hover:bg-white/[0.08] hover:border-white/18"
                >
                  <div className="shrink-0 rounded-xl bg-white/10 p-2.5 h-fit">
                    <Icon className="h-5 w-5 text-white/70" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed" style={{ fontWeight: 300 }}>
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/8 px-4 sm:px-8 py-8">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30" style={{ fontWeight: 300 }} suppressHydrationWarning>
              © {new Date().getFullYear()} SmartStart PM · Naples, Florida
            </p>
            <div className="flex items-center gap-5 text-xs text-white/35">
              <Link href="/rentals" className="hover:text-white/70 transition-colors">Rentals</Link>
              <Link href="/all-in-one-calendar" className="hover:text-white/70 transition-colors">Calendar</Link>
              <Link href="/auth/signin" className="hover:text-white/70 transition-colors">Sign In</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

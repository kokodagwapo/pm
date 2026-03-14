import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ArrowRight, Building2, BarChart3, Users, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    title: "Full Portfolio Management",
    desc: "Track properties, units, leases, and maintenance from one place.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Financial dashboards, occupancy rates, and revenue forecasting.",
  },
  {
    icon: Users,
    title: "Tenant & Owner Portals",
    desc: "Self-service tools for tenants, transparent reporting for owners.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Role-based access control, audit logs, and encrypted storage.",
  },
];

export default function HomePage() {
  return (
    <>
      <LandingHeader />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-16 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-3xl" />
            <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-sky-500/15 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 tracking-wide uppercase">
              Enterprise Property Management
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Manage properties
              <br />
              <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                smarter, not harder
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
              SmartStartPM brings together leases, maintenance, tenant communications, and
              financial analytics — in one beautifully simple platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                Sign in to Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/rentals"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-white/15 text-white/80 font-medium text-sm hover:bg-white/8 hover:text-white transition-colors"
              >
                Browse Rentals
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/8 bg-white/4 p-6 flex gap-4 items-start hover:bg-white/6 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white/90">{title}</p>
                <p className="text-sm text-white/45 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { ArrowRight, Building2, BarChart3, Users, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    title: "Full Portfolio Management",
    desc: "Track properties, units, leases, and maintenance from one unified place.",
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

      <main className="text-white">
        {/* ── Fixed video + gradient layers ── */}
        <HeroVideo />
        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.60) 100%)",
          }}
        />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-20 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Eyebrow */}
            <p
              className="inline-block text-[10px] sm:text-xs tracking-[0.35em] uppercase text-white/40 mb-10 font-light"
            >
              Enterprise Property Management
            </p>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-7xl md:text-[6rem] leading-[1.02] tracking-tight mb-8"
              style={{ fontWeight: 200 }}
            >
              Manage smarter,
              <br />
              <em
                className="not-italic text-white/55"
                style={{ fontWeight: 100 }}
              >
                not harder
              </em>
            </h1>

            {/* Sub-copy */}
            <p
              className="text-sm sm:text-base text-white/45 max-w-md mx-auto leading-relaxed mb-12 tracking-wide"
              style={{ fontWeight: 300 }}
            >
              SmartStartPM brings leases, maintenance, tenant communications,
              and financial analytics into one beautifully simple platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/signin"
                className="group inline-flex items-center gap-2.5 h-[46px] px-8 rounded-full bg-white text-slate-900 text-sm tracking-wide hover:bg-white/92 transition-all duration-300"
                style={{ fontWeight: 300 }}
              >
                Sign in to Portal
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/rentals"
                className="inline-flex items-center h-[46px] px-8 rounded-full border border-white/20 text-white/60 text-sm tracking-wide hover:border-white/40 hover:text-white/90 transition-all duration-300"
                style={{ fontWeight: 300 }}
              >
                Browse Rentals
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section
          className="relative z-10 pb-28"
          style={{ background: "rgba(2, 6, 20, 0.85)", backdropFilter: "blur(2px)" }}
        >
          <div className="max-w-5xl mx-auto px-6">
            {/* Section label */}
            <p
              className="text-center text-[10px] tracking-[0.35em] uppercase text-white/25 mb-10 font-light pt-16"
            >
              Platform Capabilities
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/8">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group p-8 flex gap-5 items-start bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/12 transition-colors">
                    <Icon className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <p
                      className="text-sm text-white/75 tracking-wide mb-1.5"
                      style={{ fontWeight: 300 }}
                    >
                      {title}
                    </p>
                    <p
                      className="text-xs text-white/35 leading-relaxed"
                      style={{ fontWeight: 300 }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom wordmark */}
            <p
              className="text-center text-[10px] tracking-[0.3em] uppercase text-white/15 mt-14 font-light"
            >
              SmartStartPM · Property Intelligence Platform
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

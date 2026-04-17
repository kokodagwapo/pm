import Link from "next/link";
import { ArrowRight, Building2, CalendarRange, CreditCard, MessageSquareText, ShieldCheck, Wrench } from "lucide-react";
import { HeroSlider } from "@/components/landing/HeroSlider";

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function LandingHomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 text-white">
      <HeroSlider
        className="z-0"
        overlayClassName="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_75%_18%,rgba(14,165,233,0.12),transparent_26%)]"
        controlsClassName="bottom-5 sm:bottom-7"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.68)_0%,rgba(15,23,42,0.34)_28%,rgba(15,23,42,0.64)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto grid min-h-[92svh] max-w-7xl gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-32">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/25 px-3 py-1.5 text-xs font-medium tracking-[0.14em] text-white/90 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Enterprise-ready · Any volume
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-sky-100/90">
            SmartStart PM · Naples, Florida
          </p>
          <h1 className="mt-4 max-w-4xl text-balance font-[var(--font-playfair)] text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            One hub for your team, tenants, and every property.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/84 sm:text-xl">
            Stay aligned. Move faster. Miss less. Owners, managers, and tenants share
            one place for messages, rent, and repairs without jumping between apps.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/signin?demo=1"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-sky-50"
            >
              See Demo
            </Link>
            <Link
              href="/rentals"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/25 bg-black/22 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/28"
            >
              View Rentals
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Pricing" value="$1.25 / property" />
            <HeroMetric label="Go-live style" value="Phased rollout" />
            <HeroMetric label="Integration model" value="API + CSV" />
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[2rem] border border-white/12 bg-black/22 p-4 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.82)] backdrop-blur-xl">
            <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/42 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
                    Operations Snapshot
                  </p>
                  <h2 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-white">
                    Everything your portfolio runs on
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/82">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 h-px bg-white/10" />

              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-3.5 py-3">
                  <MessageSquareText className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-100/90" />
                  <div>
                    <p className="text-sm font-semibold text-white">AI-assisted messaging</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      Draft and summarize faster without losing human judgment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-3.5 py-3">
                  <Wrench className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-200/90" />
                  <div>
                    <p className="text-sm font-semibold text-white">Maintenance queue</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      Requests, photos, and vendor handoffs in one clear flow.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-3.5 py-3">
                  <CreditCard className="mt-0.5 h-4.5 w-4.5 shrink-0 text-violet-200/90" />
                  <div>
                    <p className="text-sm font-semibold text-white">Rent and payments</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      Balances, reminders, and reporting stay tied to each lease.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-3.5 py-3">
                  <CalendarRange className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-200/90" />
                  <div>
                    <p className="text-sm font-semibold text-white">Calendar and availability</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      Owner holds, maintenance blocks, and occupancy planning stay aligned.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4.5 w-4.5 text-sky-100/90" />
                  <p className="text-sm font-medium text-white/80">
                    Strong encryption, optional SSO, and role-aware access.
                  </p>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-white/35 sm:block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

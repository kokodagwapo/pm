"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { ArrowRight, Building2, BarChart3, Users, Shield } from "lucide-react";

const FEATURE_KEYS = [
  { icon: Building2, titleKey: "landing.feature.portfolio.title", descKey: "landing.feature.portfolio.desc" },
  { icon: BarChart3,  titleKey: "landing.feature.analytics.title", descKey: "landing.feature.analytics.desc" },
  { icon: Users,     titleKey: "landing.feature.portals.title",   descKey: "landing.feature.portals.desc" },
  { icon: Shield,    titleKey: "landing.feature.security.title",  descKey: "landing.feature.security.desc" },
];

// Border classes for 2×2 grid dividers
// mobile: border-b on all except last; sm+: border-r on left column, border-b on top row
const CARD_BORDERS = [
  "border-b border-white/[0.10] sm:border-r sm:border-white/[0.10]",
  "border-b border-white/[0.10]",
  "border-b border-white/[0.10] sm:border-b-0 sm:border-r sm:border-white/[0.10]",
  "border-b-0",
];

export default function HomePage() {
  const { t } = useLocalizationContext();

  return (
    <>
      <LandingHeader />

      <main className="text-white" suppressHydrationWarning>
        {/* Fixed video + gradient overlay */}
        <HeroVideo />
        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.26) 42%, rgba(0,0,0,0.66) 100%)" }}
        />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-5 sm:px-8 pt-20 sm:pt-28 pb-12 sm:pb-20">
          <div className="w-full max-w-3xl mx-auto">

            {/* Eyebrow */}
            <p className="text-[9px] sm:text-[10px] tracking-[0.32em] uppercase font-light text-white/30 mb-6 sm:mb-9">
              {t("landing.eyebrow")}
            </p>

            {/* Headline — 4xl mobile → 6xl sm → 8xl md+ */}
            <h1 className="text-4xl sm:text-6xl md:text-8xl leading-tight sm:leading-none tracking-tight mb-5 sm:mb-7" style={{ fontWeight: 200 }}>
              {t("landing.hero.line1")}
              <br />
              <em className="not-italic text-white/42" style={{ fontWeight: 100 }}>
                {t("landing.hero.line2")}
              </em>
            </h1>

            {/* Sub-copy */}
            <p className="text-sm sm:text-[15px] text-white/38 max-w-[260px] sm:max-w-sm md:max-w-md mx-auto leading-[1.80] tracking-wide mb-9 sm:mb-12 md:mb-14" style={{ fontWeight: 300 }}>
              {t("landing.hero.subtext")}
            </p>

            {/* CTAs — stacked + full-width on mobile, inline on sm+ */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full max-w-[280px] sm:max-w-none mx-auto">
              <Link
                href="/auth/signin"
                className="group inline-flex items-center justify-center gap-2 h-12 sm:h-11 px-8 rounded-full border border-white/[0.14] text-white/50 text-sm tracking-wide transition-all duration-300 hover:border-white/[0.28] hover:text-white/78 active:scale-[0.97]"
                style={{ fontWeight: 300 }}
              >
                {t("landing.cta.signin")}
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/rentals"
                className="inline-flex items-center justify-center h-12 sm:h-11 px-8 rounded-full border border-white/[0.14] text-white/50 text-sm tracking-wide transition-all duration-300 hover:border-white/[0.28] hover:text-white/78 active:scale-[0.97]"
                style={{ fontWeight: 300 }}
              >
                {t("landing.cta.browse")}
              </Link>
            </div>

          </div>
        </section>

        {/* ── Features — solid dark section, scrolls over video ─────── */}
        <section className="relative z-10" style={{ background: "rgba(3, 7, 18, 0.95)", backdropFilter: "blur(2px)" }}>
          <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-8 sm:pb-10">

            {/* Section label */}
            <p className="text-center text-[9px] sm:text-[10px] tracking-[0.34em] uppercase text-white/40 mb-8 sm:mb-10" style={{ fontWeight: 400 }}>
              {t("landing.features.label")}
            </p>

            {/* 2 × 2 feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-white/[0.10] rounded-2xl overflow-hidden">
              {FEATURE_KEYS.map(({ icon: Icon, titleKey, descKey }, idx) => (
                <div
                  key={titleKey}
                  className={`group flex gap-4 items-start p-5 sm:p-6 md:p-7 bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-300 ${CARD_BORDERS[idx]}`}
                >
                  <div className="w-9 h-9 shrink-0 mt-0.5 rounded-lg bg-white/[0.08] group-hover:bg-white/[0.14] transition-colors flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/50" />
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-[13px] sm:text-sm text-white/80 tracking-wide mb-1.5" style={{ fontWeight: 400 }}>
                      {t(titleKey)}
                    </p>
                    <p className="text-[11px] sm:text-xs text-white/40 leading-[1.75]" style={{ fontWeight: 300 }}>
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-white/[0.08]" style={{ background: "rgba(3, 7, 18, 0.98)" }}>
          <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-sm text-white/70 tracking-wide" style={{ fontWeight: 400 }}>
                  SmartStartPM
                </span>
              </div>
              <p className="text-xs text-white/35 tracking-wide" style={{ fontWeight: 300 }}>
                {t("landing.footer.wordmark")}
              </p>
              <div className="flex items-center gap-5">
                <Link href="/auth/signin" className="text-xs text-white/40 hover:text-white/70 transition-colors" style={{ fontWeight: 300 }}>
                  {t("landing.cta.signin")}
                </Link>
                <Link href="/rentals" className="text-xs text-white/40 hover:text-white/70 transition-colors" style={{ fontWeight: 300 }}>
                  {t("landing.cta.browse")}
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

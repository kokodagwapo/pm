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

export default function HomePage() {
  const { t } = useLocalizationContext();

  return (
    <>
      <LandingHeader />

      <main className="text-white">
        {/* ── Fixed video + gradient ── */}
        <HeroVideo />
        <div
          className="fixed inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.62) 100%)",
          }}
        />

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-20 text-center">
          <div className="max-w-4xl mx-auto">

            {/* Eyebrow */}
            <p className="inline-block text-[10px] sm:text-[11px] tracking-[0.38em] uppercase text-white/35 mb-10 font-light">
              {t("landing.eyebrow")}
            </p>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-7xl md:text-[6.25rem] leading-[1.02] tracking-tight mb-8"
              style={{ fontWeight: 200 }}
            >
              {t("landing.hero.line1")}
              <br />
              <em className="not-italic text-white/50" style={{ fontWeight: 100 }}>
                {t("landing.hero.line2")}
              </em>
            </h1>

            {/* Sub-copy */}
            <p
              className="text-sm sm:text-[15px] text-white/40 max-w-md mx-auto leading-relaxed mb-14 tracking-wide"
              style={{ fontWeight: 300 }}
            >
              {t("landing.hero.subtext")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Primary — clean white pill */}
              <Link
                href="/auth/signin"
                className="group relative inline-flex items-center gap-2 h-11 px-7 rounded-full bg-white text-slate-900 text-sm tracking-wide overflow-hidden transition-all duration-300 hover:shadow-[0_0_28px_rgba(255,255,255,0.25)]"
                style={{ fontWeight: 300 }}
              >
                {t("landing.cta.signin")}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>

              {/* Secondary — ghost pill */}
              <Link
                href="/rentals"
                className="inline-flex items-center h-11 px-7 rounded-full text-white/50 text-sm tracking-wide border border-white/12 hover:border-white/28 hover:text-white/80 transition-all duration-300"
                style={{ fontWeight: 300 }}
              >
                {t("landing.cta.browse")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features (scrolls over video with solid backdrop) ───────── */}
        <section
          className="relative z-10 pb-28"
          style={{ background: "rgba(3, 7, 18, 0.88)", backdropFilter: "blur(1px)" }}
        >
          <div className="max-w-5xl mx-auto px-6">
            {/* Section eyebrow */}
            <p className="text-center text-[9px] tracking-[0.38em] uppercase text-white/20 mb-10 font-light pt-16">
              {t("landing.features.label")}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-white/[0.07] rounded-2xl overflow-hidden divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-white/[0.07]">
              {FEATURE_KEYS.map(({ icon: Icon, titleKey, descKey }, idx) => (
                <div
                  key={titleKey}
                  className={`group p-8 flex gap-5 items-start bg-white/[0.025] hover:bg-white/[0.05] transition-colors duration-300 ${
                    idx === 2 ? "sm:border-t sm:border-white/[0.07]" : ""
                  } ${idx === 3 ? "sm:border-t sm:border-white/[0.07]" : ""}`}
                >
                  <div className="w-7 h-7 rounded-md bg-white/[0.07] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-white/35" />
                  </div>
                  <div>
                    <p className="text-[13px] text-white/70 tracking-wide mb-1.5" style={{ fontWeight: 300 }}>
                      {t(titleKey)}
                    </p>
                    <p className="text-xs text-white/30 leading-relaxed" style={{ fontWeight: 300 }}>
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom wordmark */}
            <p className="text-center text-[9px] tracking-[0.32em] uppercase text-white/12 mt-16 font-light">
              {t("landing.footer.wordmark")}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

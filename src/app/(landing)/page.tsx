"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSlider } from "@/components/landing/HeroSlider";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useLandingTheme } from "@/components/landing/LandingThemeProvider";
import { cn } from "@/lib/utils";
import { LandingPricingComparison } from "@/components/landing/home/LandingPricingComparison";
import {
  LandingTrustStrip,
  LandingCapabilities,
  LandingWhySwitch,
  LandingDifferentiator,
  LandingIntegrationsVisual,
  LandingRolesGrid,
  LandingAiPractical,
  LandingMigrationComfort,
  LandingDormitories,
  LandingWhiteLabel,
  LandingFinalCta,
} from "@/components/landing/home/LandingBelowFold";

export default function HomePage() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <>
      <LandingHeader />

      <main
        className={cn(
          "min-h-screen font-[var(--font-jakarta)] antialiased",
          dark ? "text-white" : "text-slate-900"
        )}
        suppressHydrationWarning
      >
        <HeroSlider />

        <section
          data-landing-nav-bg="dark"
          className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24 text-center text-white sm:px-8 sm:pb-20 sm:pt-28"
        >
          <div className="relative z-10 mx-auto w-full max-w-[40rem]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/35 bg-white/15 px-3 py-1.5 shadow-sm backdrop-blur-md sm:mb-6">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium tracking-wide text-white/90">{t("landing.home.hero.badge")}</span>
            </div>

            <p className="mb-4 font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest text-white/55 sm:mb-5">
              {t("landing.home.hero.eyebrow")}
            </p>

            <h1
              className="mb-5 text-balance text-[2.125rem] font-normal leading-[1.12] tracking-tight sm:mb-6 sm:text-5xl sm:leading-[1.1] md:text-6xl md:leading-[1.08]"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              <span className="block">{t("landing.home.hero.title1")}</span>
              <span className="mt-2 block text-white/75 sm:mt-3">{t("landing.home.hero.title2")}</span>
            </h1>

            <p className="mx-auto mb-8 max-w-[32rem] font-[var(--font-jakarta)] text-base font-normal leading-relaxed text-white/80 sm:mb-9 sm:text-lg">
              {t("landing.home.hero.sub")}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              <Link
                href="/auth/signin?demo=1"
                className="inline-flex min-h-9 touch-manipulation items-center justify-center rounded-xl border border-white/45 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:border-white/55 hover:bg-white/20"
              >
                {t("landing.home.hero.cta.viewDemo")}
              </Link>
              <Link
                href="/rentals"
                className="inline-flex min-h-9 touch-manipulation items-center justify-center rounded-xl border border-white/45 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:border-white/55 hover:bg-white/20"
              >
                {t("landing.home.hero.cta.viewRentals")}
              </Link>
            </div>
          </div>
        </section>

        <div className="landing-post-hero font-[var(--font-jakarta)] antialiased">
          <LandingTrustStrip />
          <LandingCapabilities />
          <LandingDifferentiator />
          <LandingWhySwitch />
          <LandingPricingComparison />
          <LandingDormitories />
          <LandingIntegrationsVisual />
          <LandingRolesGrid />
          <LandingWhiteLabel />
          <LandingAiPractical />
          <LandingMigrationComfort />
          <LandingFinalCta />
        </div>

        <footer
          data-landing-nav-bg="dark"
          className="relative z-10 border-t border-white/10 bg-black/35 backdrop-blur-md supports-[backdrop-filter]:bg-black/28 transition-[background-color,border-color] duration-200"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-3 sm:justify-between sm:px-6 sm:py-3.5">
            <span className="font-[var(--font-jakarta)] text-[11px] font-medium tracking-wide text-white/60">
              SmartStart PM
            </span>
            <a
              href="mailto:hi@smartstart.us"
              className="font-[var(--font-jakarta)] text-[11px] font-medium tracking-wide text-white/75 transition-colors hover:text-white"
            >
              hi@smartstart.us
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

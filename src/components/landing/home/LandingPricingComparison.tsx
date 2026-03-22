"use client";

import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useLandingTheme } from "@/components/landing/LandingThemeProvider";
import { LandingReveal } from "@/components/landing/home/LandingReveal";
import { Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

function CompareRow({
  label,
  smartstart,
  legacy,
  dark,
}: {
  label: string;
  smartstart: boolean;
  legacy: boolean;
  dark: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 border-b py-2.5 text-[15px] last:border-b-0 sm:gap-x-3",
        dark ? "border-white/10" : "border-slate-200"
      )}
    >
      <span className={cn("min-w-0 break-words pr-1 font-normal leading-snug sm:pr-2", dark ? "text-white/70" : "text-slate-700")}>
        {label}
      </span>
      <span className="flex w-8 justify-center" aria-hidden>
        {smartstart ? (
          <Check
            className={cn("h-4 w-4", dark ? "text-emerald-400/90" : "text-emerald-600")}
            strokeWidth={2.25}
          />
        ) : (
          <span className={cn("text-xs opacity-40", dark ? "text-white" : "text-slate-400")}>·</span>
        )}
      </span>
      <span className="flex w-8 justify-center" aria-hidden>
        {legacy ? (
          <Check className={cn("h-4 w-4", dark ? "text-white/35" : "text-slate-400")} strokeWidth={2.25} />
        ) : (
          <span className={cn("text-xs opacity-40", dark ? "text-white" : "text-slate-400")}>·</span>
        )}
      </span>
    </div>
  );
}

export function LandingPricingComparison() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="pricing"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.97)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-100/90 text-emerald-700"
              )}
              aria-hidden
            >
              <Tag className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <p
            className={cn(
              "mb-4 text-center font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest",
              dark ? "text-white/50" : "text-slate-500"
            )}
          >
            {t("landing.home.pricing.kicker")}
          </p>
          <h2
            className={cn(
              "mb-3 text-center font-[var(--font-playfair)] text-balance text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.1]",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.pricing.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:mb-16 sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.pricing.subtitle")}
          </p>

          <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
            <div
              className={cn(
                "relative min-w-0 overflow-hidden rounded-2xl border p-6 sm:rounded-3xl sm:p-8",
                dark
                  ? "shadow-lg backdrop-blur-xl border-emerald-400/20 bg-emerald-950/35 shadow-emerald-950/40"
                  : "border-emerald-200/90 bg-emerald-50 shadow-sm"
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
                  dark ? "bg-emerald-500/10" : "hidden"
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full blur-3xl",
                  dark ? "bg-cyan-500/5" : "hidden"
                )}
              />

              <div className="relative">
                <div className="mb-6 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-xl border px-2.5 py-1 text-xs font-medium uppercase tracking-wider",
                      dark
                        ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-200"
                        : "border-emerald-300/80 bg-emerald-100/80 text-emerald-900"
                    )}
                  >
                    {t("landing.home.pricing.badge.you")}
                  </span>
                </div>
                <h3
                  className={cn(
                    "mb-1 font-[var(--font-playfair)] text-xl font-normal tracking-tight sm:text-2xl",
                    dark ? "text-white" : "text-slate-900"
                  )}
                >
                  {t("landing.home.pricing.smartstart.name")}
                </h3>
                <p
                  className={cn(
                    "mb-8 font-[var(--font-jakarta)] text-[15px] font-normal leading-relaxed",
                    dark ? "text-white/65" : "text-slate-600"
                  )}
                >
                  {t("landing.home.pricing.smartstart.tagline")}
                </p>

                <div className="mb-8">
                  <div className="mb-2 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "font-[var(--font-jakarta)] text-4xl font-semibold tracking-tight sm:text-5xl",
                        dark ? "text-white" : "text-slate-900"
                      )}
                    >
                      {t("landing.home.pricing.smartstart.price")}
                    </span>
                    <span className={cn("text-sm font-normal", dark ? "text-white/55" : "text-slate-500")}>
                      {t("landing.home.pricing.smartstart.per")}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-normal leading-relaxed",
                      dark ? "text-emerald-200/80" : "text-emerald-800/90"
                    )}
                  >
                    {t("landing.home.pricing.smartstart.note")}
                  </p>
                  <p
                    className={cn(
                      "mt-3 text-sm font-normal leading-relaxed",
                      dark ? "text-white/70" : "text-slate-600"
                    )}
                  >
                    {t("landing.home.pricing.smartstart.transparency")}
                  </p>
                </div>

                <div className="mb-8 space-y-3">
                  <p
                    className={cn(
                      "mb-2 text-xs font-semibold uppercase tracking-wider",
                      dark ? "text-white/50" : "text-slate-500"
                    )}
                  >
                    {t("landing.home.pricing.visual.label")}
                  </p>
                  <div
                    className={cn(
                      "rounded-xl border p-3",
                      dark ? "border-white/15 bg-black/25 backdrop-blur-md" : "border-slate-200/90 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-2 flex items-center justify-between text-xs font-medium",
                        dark ? "text-white/55" : "text-slate-600"
                      )}
                    >
                      <span>{t("landing.home.pricing.visual.cost")}</span>
                      <span className="text-emerald-400/90">{t("landing.home.pricing.visual.lower")}</span>
                    </div>
                    <div className={cn("h-2.5 overflow-hidden rounded-full", dark ? "bg-white/[0.06]" : "bg-slate-200")}>
                      <div
                        className="landing-price-bar h-full w-[22%] rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                        style={{ maxWidth: "100%" }}
                      />
                    </div>
                  </div>
                </div>

                <ul className={cn("space-y-2.5 text-[15px] font-normal leading-relaxed", dark ? "text-white/75" : "text-slate-700")}>
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check
                        className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-emerald-400/80" : "text-emerald-600")}
                        strokeWidth={2}
                      />
                      <span>{t(`landing.home.pricing.smartstart.bullet.${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className={cn(
                "relative min-w-0 rounded-2xl border p-6 sm:rounded-3xl sm:p-8",
                dark ? "shadow-lg backdrop-blur-xl border-white/15 bg-white/[0.06]" : "border-slate-200/90 bg-white shadow-sm"
              )}
            >
              <h3
                className={cn(
                  "mb-1 font-[var(--font-playfair)] text-xl font-normal tracking-tight sm:text-2xl",
                  dark ? "text-white/90" : "text-slate-800"
                )}
              >
                {t("landing.home.pricing.legacy.name")}
              </h3>
              <p
                className={cn(
                  "mb-8 font-[var(--font-jakarta)] text-[15px] font-normal leading-relaxed",
                  dark ? "text-white/60" : "text-slate-600"
                )}
              >
                {t("landing.home.pricing.legacy.tagline")}
              </p>

              <div className="mb-8">
                <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
                  <span
                    className={cn(
                      "font-[var(--font-jakarta)] text-3xl font-medium tracking-tight sm:text-4xl",
                      dark ? "text-white/50" : "text-slate-500"
                    )}
                  >
                    {t("landing.home.pricing.legacy.range")}
                  </span>
                  <span className={cn("text-sm font-normal", dark ? "text-white/50" : "text-slate-500")}>
                    {t("landing.home.pricing.legacy.per")}
                  </span>
                </div>
                <p className={cn("text-sm font-normal leading-relaxed", dark ? "text-white/60" : "text-slate-600")}>
                  {t("landing.home.pricing.legacy.minimums")}
                </p>
                <p className={cn("mt-2 text-sm font-normal leading-relaxed", dark ? "text-white/55" : "text-slate-600")}>
                  {t("landing.home.pricing.legacy.addons")}
                </p>
              </div>

              <div className="mb-8 space-y-3">
                <p
                  className={cn(
                    "mb-2 text-xs font-semibold uppercase tracking-wider",
                    dark ? "text-white/50" : "text-slate-500"
                  )}
                >
                  {t("landing.home.pricing.visual.label")}
                </p>
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    dark ? "border-white/15 bg-black/20 backdrop-blur-md" : "border-slate-200/90 bg-slate-50"
                  )}
                >
                  <div
                    className={cn(
                      "mb-2 flex items-center justify-between text-xs font-medium",
                      dark ? "text-white/55" : "text-slate-600"
                    )}
                  >
                    <span>{t("landing.home.pricing.visual.cost")}</span>
                    <span className={dark ? "text-white/35" : "text-slate-400"}>
                      {t("landing.home.pricing.visual.higher")}
                    </span>
                  </div>
                  <div className={cn("h-2.5 overflow-hidden rounded-full", dark ? "bg-white/[0.06]" : "bg-slate-200")}>
                    <div
                      className={cn(
                        "landing-price-bar landing-price-bar--delayed h-full w-[88%] rounded-full bg-gradient-to-r",
                        dark ? "from-white/25 to-white/10" : "from-slate-400 to-slate-300"
                      )}
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "overflow-hidden rounded-xl border",
                  dark ? "border-white/15 bg-white/[0.05] backdrop-blur-md" : "border-slate-200/90 bg-white"
                )}
              >
                <div
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-2 gap-y-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider sm:gap-x-3",
                    dark ? "border-b border-white/10 bg-white/[0.06] text-white/50" : "border-b border-slate-200/80 bg-slate-50 text-slate-500"
                  )}
                >
                  <span className="min-w-0" />
                  <span className="w-8 shrink-0 text-center">{t("landing.home.pricing.col.ss")}</span>
                  <span className="w-8 shrink-0 text-center">{t("landing.home.pricing.col.typical")}</span>
                </div>
                <div className="px-3 pb-2">
                  <CompareRow label={t("landing.home.pricing.row.noMin")} smartstart legacy={false} dark={dark} />
                  <CompareRow label={t("landing.home.pricing.row.volume")} smartstart legacy={false} dark={dark} />
                  <CompareRow label={t("landing.home.pricing.row.custom")} smartstart legacy={false} dark={dark} />
                  <CompareRow label={t("landing.home.pricing.row.migrate")} smartstart legacy={false} dark={dark} />
                  <CompareRow label={t("landing.home.pricing.row.api")} smartstart legacy={false} dark={dark} />
                  <CompareRow label={t("landing.home.pricing.row.ai")} smartstart legacy={false} dark={dark} />
                </div>
              </div>
            </div>
          </div>

          <p
            className={cn(
              "mx-auto mt-12 max-w-2xl text-center font-[var(--font-jakarta)] text-sm font-normal leading-relaxed text-balance",
              dark ? "text-white/55" : "text-slate-500"
            )}
          >
            {t("landing.home.pricing.footnote")}
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useLandingTheme } from "@/components/landing/LandingThemeProvider";
import { LandingReveal } from "@/components/landing/home/LandingReveal";
import {
  BadgeCheck,
  Bell,
  Bot,
  Building2,
  Calculator,
  Calendar,
  CalendarOff,
  Check,
  Cloud,
  Cpu,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Layers2,
  Link2,
  Mail,
  MessageCircle,
  Network,
  Rocket,
  Route,
  Scale,
  Server,
  ShieldCheck,
  Sparkles,
  UserCircle,
  UserSearch,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_KEYS = [
  "landing.home.trust.i1",
  "landing.home.trust.i2",
  "landing.home.trust.i3",
  "landing.home.trust.i4",
  "landing.home.trust.i5",
  "landing.home.trust.i6",
  "landing.home.trust.i7",
  "landing.home.trust.i8",
  "landing.home.trust.i9",
] as const;

const PAIN_KEYS = [
  "landing.home.why.pain.1",
  "landing.home.why.pain.2",
  "landing.home.why.pain.3",
  "landing.home.why.pain.4",
  "landing.home.why.pain.5",
  "landing.home.why.pain.6",
  "landing.home.why.pain.7",
] as const;

const ANSWER_KEYS = [
  "landing.home.why.answer.1",
  "landing.home.why.answer.2",
  "landing.home.why.answer.3",
  "landing.home.why.answer.4",
  "landing.home.why.answer.5",
  "landing.home.why.answer.6",
] as const;

const ROLE_KEYS = [
  { key: "landing.home.roles.pm", icon: Building2 },
  { key: "landing.home.roles.owner", icon: Wallet },
  { key: "landing.home.roles.admin", icon: ShieldCheck },
  { key: "landing.home.roles.staff", icon: Users },
  { key: "landing.home.roles.tenant", icon: UserCircle },
  { key: "landing.home.roles.vendor", icon: Wrench },
] as const;

const CAPABILITY_ITEMS = [
  { slug: "aiMessaging", icon: Bot },
  { slug: "directMessaging", icon: MessageCircle },
  { slug: "maintenance", icon: Wrench },
  { slug: "calendarBlocks", icon: CalendarOff },
  { slug: "applications", icon: ClipboardList },
  { slug: "verification", icon: BadgeCheck },
  { slug: "screening", icon: UserSearch },
  { slug: "incomeFico", icon: Gauge },
  { slug: "rentPayments", icon: CreditCard },
  { slug: "accountingTax", icon: Calculator },
  { slug: "leasesDocs", icon: FileText },
  { slug: "alerts", icon: Bell },
] as const;

const CAP_PASTEL = [
  { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/15 text-violet-200" },
  { light: "bg-sky-100 text-sky-800", dark: "bg-sky-500/15 text-sky-200" },
  { light: "bg-amber-100 text-amber-800", dark: "bg-amber-500/15 text-amber-200" },
  { light: "bg-rose-100 text-rose-800", dark: "bg-rose-500/15 text-rose-200" },
  { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/15 text-emerald-200" },
  { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/15 text-indigo-200" },
  { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/15 text-orange-200" },
  { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-500/15 text-cyan-200" },
  { light: "bg-teal-100 text-teal-800", dark: "bg-teal-500/15 text-teal-200" },
  { light: "bg-fuchsia-100 text-fuchsia-800", dark: "bg-fuchsia-500/15 text-fuchsia-200" },
  { light: "bg-lime-100 text-lime-900", dark: "bg-lime-500/15 text-lime-200" },
  { light: "bg-blue-100 text-blue-900", dark: "bg-blue-500/15 text-blue-200" },
] as const;

const ROLE_PASTEL = [
  { light: "bg-amber-100 text-amber-800", dark: "bg-amber-500/15 text-amber-200" },
  { light: "bg-sky-100 text-sky-800", dark: "bg-sky-500/15 text-sky-200" },
  { light: "bg-rose-100 text-rose-800", dark: "bg-rose-500/15 text-rose-200" },
  { light: "bg-violet-100 text-violet-800", dark: "bg-violet-500/15 text-violet-200" },
  { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/15 text-emerald-200" },
  { light: "bg-teal-100 text-teal-800", dark: "bg-teal-500/15 text-teal-200" },
] as const;

function glassCard(dark: boolean, ...extra: (string | undefined)[]) {
  return cn(
    "border backdrop-blur-xl shadow-lg",
    dark ? "border-white/15 bg-white/[0.08]" : "border-white/55 bg-white/45 shadow-slate-900/[0.08]",
    ...extra
  );
}

export function LandingTrustStrip() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="trust"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.92)]" : "border-slate-200/80 bg-slate-50"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-12">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
              dark ? "bg-sky-500/15 text-sky-200" : "bg-sky-100 text-sky-700"
            )}
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p
            className={cn(
              "text-center font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest",
              dark ? "text-white/50" : "text-slate-500"
            )}
          >
            {t("landing.home.trust.label")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
          {TRUST_KEYS.map((k) => (
            <span
              key={k}
              className={cn(
                glassCard(dark),
                "rounded-2xl px-3 py-2 text-xs font-normal leading-snug",
                dark ? "text-white/85" : "text-slate-800"
              )}
            >
              {t(k)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCapabilities() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="features"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(2,6,15,0.97)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-100 text-emerald-800"
              )}
              aria-hidden
            >
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-center text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.capabilities.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-4 max-w-2xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.capabilities.lead")}
          </p>
          <p
            className={cn(
              "mx-auto mb-12 max-w-2xl text-center font-[var(--font-jakarta)] text-xs font-normal leading-relaxed sm:text-sm",
              dark ? "text-white/45" : "text-slate-500"
            )}
          >
            {t("landing.home.capabilities.disclaimer")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {CAPABILITY_ITEMS.map(({ slug, icon: Icon }, i) => {
              const pastel = CAP_PASTEL[i % CAP_PASTEL.length];
              return (
                <div
                  key={slug}
                  className={cn(
                    glassCard(dark),
                    "rounded-2xl p-5 transition-colors sm:p-6 overflow-hidden min-w-0",
                    dark ? "hover:border-white/25 hover:bg-white/[0.08]" : "hover:border-slate-200 hover:bg-slate-50/80"
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                      dark ? pastel.dark : pastel.light
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3
                    className={cn(
                      "mb-2 font-[var(--font-playfair)] text-lg font-normal tracking-tight break-words",
                      dark ? "text-white" : "text-slate-900"
                    )}
                  >
                    {t(`landing.home.capabilities.items.${slug}.title`)}
                  </h3>
                  <p
                    className={cn(
                      "font-[var(--font-jakarta)] text-[15px] font-normal leading-relaxed break-words",
                      dark ? "text-white/65" : "text-slate-600"
                    )}
                  >
                    {t(`landing.home.capabilities.items.${slug}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingWhySwitch() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="why"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.96)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-violet-500/15 text-violet-200" : "bg-violet-100 text-violet-700"
              )}
              aria-hidden
            >
              <Scale className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-center text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.why.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:mb-14 sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.why.lead")}
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
            <div
              className={cn(
                glassCard(dark),
                "rounded-2xl p-6 sm:p-8 overflow-hidden min-w-0",
                dark ? "border-white/12 bg-black/30" : "border-slate-200/80 bg-white/55"
              )}
            >
              <p
                className={cn(
                  "mb-4 text-xs font-semibold uppercase tracking-wider",
                  dark ? "text-white/55" : "text-slate-500"
                )}
              >
                {t("landing.home.why.colLegacy")}
              </p>
              <ul className="space-y-3.5 min-w-0">
                {PAIN_KEYS.map((k) => (
                  <li
                    key={k}
                    className={cn(
                      "flex gap-3 border-l-2 pl-4 text-[15px] font-normal leading-relaxed break-words min-w-0",
                      dark
                        ? "border-white/10 text-white/70"
                        : "border-slate-200 text-slate-600"
                    )}
                  >
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn(
                glassCard(dark),
                "rounded-2xl p-6 sm:p-8 overflow-hidden min-w-0",
                dark ? "border-emerald-400/25 bg-emerald-950/30" : "border-emerald-200/70 bg-emerald-50/50"
              )}
            >
              <p
                className={cn(
                  "mb-4 text-xs font-semibold uppercase tracking-wider break-words",
                  dark ? "text-emerald-200/70" : "text-emerald-800/80"
                )}
              >
                {t("landing.home.why.colUs")}
              </p>
              <ul className="space-y-3.5 min-w-0">
                {ANSWER_KEYS.map((k) => (
                  <li
                    key={k}
                    className={cn(
                      "flex gap-3 text-[15px] font-normal leading-relaxed break-words min-w-0",
                      dark ? "text-white/85" : "text-slate-800"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1 w-1 shrink-0 rounded-full",
                        dark ? "bg-emerald-400/70" : "bg-emerald-500"
                      )}
                    />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingDifferentiator() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 border-t",
        dark ? "border-white/[0.06] bg-[rgba(2,6,15,0.98)]" : "border-slate-200/80 bg-slate-50"
      )}
    >
      <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8 sm:py-16">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-indigo-500/15 text-indigo-200" : "bg-indigo-100 text-indigo-700"
              )}
              aria-hidden
            >
              <Layers2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-2xl font-normal leading-[1.12] tracking-tight sm:text-3xl sm:leading-[1.1] mb-8",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.diff.title")}
          </h2>
          <ul
            className={cn(
              "space-y-4 text-left font-[var(--font-jakarta)] text-[15px] font-normal leading-relaxed sm:text-base",
              dark ? "text-white/70" : "text-slate-600"
            )}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 w-6 shrink-0 font-[var(--font-jakarta)] text-sm font-medium tabular-nums",
                    dark ? "text-white/40" : "text-slate-400"
                  )}
                >
                  {i}.
                </span>
                <span>{t(`landing.home.diff.line.${i}`)}</span>
              </li>
            ))}
          </ul>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingIntegrationsVisual() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";
  const nodes = [
    { icon: Link2, labelKey: "landing.home.connect.node.crm" },
    { icon: Wallet, labelKey: "landing.home.connect.node.qb" },
    { icon: Database, labelKey: "landing.home.connect.node.pm" },
    { icon: GitBranch, labelKey: "landing.home.connect.node.api" },
    { icon: Zap, labelKey: "landing.home.connect.node.csv" },
    { icon: Cloud, labelKey: "landing.home.connect.node.cloud" },
    { icon: Server, labelKey: "landing.home.connect.node.local" },
    { icon: Calendar, labelKey: "landing.home.connect.node.calendar" },
    { icon: Mail, labelKey: "landing.home.connect.node.messaging" },
  ] as const;

  const NODE_PASTEL = [
    { light: "bg-violet-100 text-violet-700", dark: "bg-violet-500/12 text-violet-200/90" },
    { light: "bg-amber-100 text-amber-800", dark: "bg-amber-500/12 text-amber-200/90" },
    { light: "bg-sky-100 text-sky-800", dark: "bg-sky-500/12 text-sky-200/90" },
    { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-500/12 text-emerald-200/90" },
    { light: "bg-orange-100 text-orange-800", dark: "bg-orange-500/12 text-orange-200/90" },
    { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-500/12 text-cyan-200/90" },
    { light: "bg-slate-200 text-slate-700", dark: "bg-white/[0.08] text-white/70" },
    { light: "bg-fuchsia-100 text-fuchsia-800", dark: "bg-fuchsia-500/12 text-fuchsia-200/90" },
    { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-500/12 text-indigo-200/90" },
  ] as const;

  return (
    <section
      id="connect"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 overflow-hidden border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.95)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-cyan-500/15 text-cyan-200" : "bg-cyan-100 text-cyan-700"
              )}
              aria-hidden
            >
              <Network className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-center text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.connect.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-2xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.connect.sub")}
          </p>

          <div className="relative mx-auto max-w-4xl">
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 h-[min(100%,28rem)] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
                dark ? "bg-indigo-500/[0.07]" : "bg-indigo-400/10"
              )}
            />

            <div
              className={cn(
                glassCard(dark),
                "relative rounded-3xl p-5 sm:p-12 overflow-hidden min-w-0",
                dark ? "border-white/12 bg-white/[0.06]" : "border-slate-200/80 bg-white"
              )}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    glassCard(dark),
                    "landing-connect-hub mb-6 sm:mb-8 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-center overflow-hidden min-w-0",
                    dark ? "border-indigo-400/30 bg-indigo-950/40" : "border-indigo-200/90 bg-indigo-50"
                  )}
                >
                  <p
                    className={cn(
                      "mb-1 text-xs font-medium uppercase tracking-widest break-words",
                      dark ? "text-indigo-200/75" : "text-indigo-700"
                    )}
                  >
                    {t("landing.home.connect.hub.kicker")}
                  </p>
                  <p
                    className={cn(
                      "font-[var(--font-jakarta)] text-lg font-semibold tracking-tight break-words",
                      dark ? "text-white" : "text-slate-900"
                    )}
                  >
                    SmartStart PM
                  </p>
                </div>

                <div className="grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 overflow-hidden">
                  {nodes.map(({ icon: Icon, labelKey }, i) => {
                    const pastel = NODE_PASTEL[i % NODE_PASTEL.length];
                    return (
                    <div
                      key={labelKey}
                      className={cn(
                        glassCard(dark),
                        "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors sm:px-4 overflow-hidden min-w-0",
                        dark ? "hover:border-white/25 hover:bg-white/[0.1]" : "hover:border-slate-200 hover:bg-slate-50/90"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shrink-0",
                          dark ? pastel.dark : pastel.light
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <span
                        className={cn(
                          "text-left text-sm font-normal leading-snug break-words min-w-0",
                          dark ? "text-white/80" : "text-slate-700"
                        )}
                      >
                        {t(labelKey)}
                      </span>
                    </div>
                  );
                  })}
                </div>

                <p
                  className={cn(
                    "mt-10 max-w-lg text-center text-sm font-normal leading-relaxed",
                    dark ? "text-white/60" : "text-slate-600"
                  )}
                >
                  {t("landing.home.connect.footer")}
                </p>
              </div>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingRolesGrid() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="roles"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(2,6,15,0.98)]" : "border-slate-200/80 bg-slate-50"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-amber-500/15 text-amber-200" : "bg-amber-100 text-amber-800"
              )}
              aria-hidden
            >
              <UsersRound className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-center text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.roles.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.roles.sub")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {ROLE_KEYS.map(({ key, icon: Icon }, i) => {
              const pastel = ROLE_PASTEL[i % ROLE_PASTEL.length];
              return (
              <div
                key={key}
                className={cn(
                  glassCard(dark),
                  "group rounded-2xl p-5 transition-colors sm:p-6 overflow-hidden min-w-0",
                  dark ? "hover:border-white/25 hover:bg-white/[0.12]" : "hover:border-slate-200 hover:bg-white"
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors shrink-0",
                    dark ? pastel.dark : pastel.light
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3
                  className={cn(
                    "mb-2 font-[var(--font-playfair)] text-base font-normal tracking-tight break-words",
                    dark ? "text-white" : "text-slate-900"
                  )}
                >
                  {t(`${key}.title`)}
                </h3>
                <p
                  className={cn(
                    "font-[var(--font-jakarta)] text-[15px] font-normal leading-relaxed break-words",
                    dark ? "text-white/65" : "text-slate-600"
                  )}
                >
                  {t(`${key}.desc`)}
                </p>
              </div>
            );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingAiPractical() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";
  const bullets = [
    "landing.home.ai.b1",
    "landing.home.ai.b2",
    "landing.home.ai.b3",
    "landing.home.ai.b4",
    "landing.home.ai.b5",
    "landing.home.ai.b6",
  ] as const;
  return (
    <section
      id="ai"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.96)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <LandingReveal>
            <div className="mb-4 flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-xl p-2.5 shadow-sm",
                  dark ? "bg-fuchsia-500/15 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
                )}
                aria-hidden
              >
                <Cpu className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span
                className={cn(
                  "font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest",
                  dark ? "text-white/55" : "text-slate-500"
                )}
              >
                {t("landing.home.ai.kicker")}
              </span>
            </div>
            <h2
              className={cn(
                "font-[var(--font-playfair)] text-balance text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-6",
                dark ? "text-white" : "text-slate-900"
              )}
            >
              {t("landing.home.ai.title")}
            </h2>
            <p
              className={cn(
                "mb-8 font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
                dark ? "text-white/65" : "text-slate-600"
              )}
            >
              {t("landing.home.ai.lead")}
            </p>
            <ul className="space-y-3">
              {bullets.map((k) => (
                <li
                  key={k}
                  className={cn(
                    "flex gap-3 text-[15px] font-normal leading-relaxed",
                    dark ? "text-white/75" : "text-slate-700"
                  )}
                >
                  <Sparkles
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      dark ? "text-violet-400/50" : "text-violet-500/70"
                    )}
                  />
                  {t(k)}
                </li>
              ))}
            </ul>
          </LandingReveal>

          <LandingReveal>
            <div
              className={cn(
                glassCard(dark),
                "rounded-2xl p-6 sm:p-8 lg:mt-4",
                dark ? "border-violet-400/20 bg-violet-950/35" : "border-violet-200/70 bg-violet-50/50"
              )}
            >
              <p
                className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  dark ? "text-violet-200/70" : "text-violet-800/80"
                )}
              >
                {t("landing.home.ai.panel.kicker")}
              </p>
              <p
                className={cn(
                  "mb-6 font-[var(--font-playfair)] text-xl font-normal leading-snug tracking-tight sm:text-2xl",
                  dark ? "text-white" : "text-slate-900"
                )}
              >
                {t("landing.home.ai.panel.title")}
              </p>
              <ul
                className={cn(
                  "space-y-3 border-t pt-6 text-[15px] font-normal leading-relaxed",
                  dark ? "border-white/10 text-white/70" : "border-violet-200/60 text-slate-700"
                )}
              >
                <li className="flex gap-2">
                  <span className={cn("shrink-0", dark ? "text-violet-400/70" : "text-violet-600")}>•</span>
                  {t("landing.home.ai.panel.m1")}
                </li>
                <li className="flex gap-2">
                  <span className={cn("shrink-0", dark ? "text-violet-400/70" : "text-violet-600")}>•</span>
                  {t("landing.home.ai.panel.m2")}
                </li>
                <li className="flex gap-2">
                  <span className={cn("shrink-0", dark ? "text-violet-400/70" : "text-violet-600")}>•</span>
                  {t("landing.home.ai.panel.m3")}
                </li>
              </ul>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}

export function LandingMigrationComfort() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";
  const items = [
    "landing.home.migrate.i1",
    "landing.home.migrate.i2",
    "landing.home.migrate.i3",
    "landing.home.migrate.i4",
    "landing.home.migrate.i5",
    "landing.home.migrate.i6",
  ] as const;
  return (
    <section
      id="migrate"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(2,6,15,0.98)]" : "border-slate-200/80 bg-slate-50"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-orange-500/15 text-orange-200" : "bg-orange-100 text-orange-800"
              )}
              aria-hidden
            >
              <Route className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-center text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.migrate.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.migrate.sub")}
          </p>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((k) => (
              <div
                key={k}
                className={cn(
                  glassCard(dark),
                  "rounded-xl px-4 py-4 text-[15px] font-normal leading-relaxed overflow-hidden min-w-0 break-words",
                  dark ? "text-white/80" : "text-slate-800"
                )}
              >
                {t(k)}
              </div>
            ))}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingDormitories() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";
  const items = [
    "landing.home.dormitories.item.1",
    "landing.home.dormitories.item.2",
    "landing.home.dormitories.item.3",
    "landing.home.dormitories.item.4",
    "landing.home.dormitories.item.5",
  ] as const;

  return (
    <section
      id="dormitories"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(3,7,18,0.97)]" : "border-slate-200/80 bg-white"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-indigo-500/15 text-indigo-200" : "bg-indigo-100 text-indigo-800"
              )}
              aria-hidden
            >
              <Building2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <p
            className={cn(
              "mb-4 text-center font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest",
              dark ? "text-white/50" : "text-slate-500"
            )}
          >
            {t("landing.home.dormitories.kicker")}
          </p>
          <h2
            className={cn(
              "mb-3 text-center font-[var(--font-playfair)] text-balance text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.1]",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.dormitories.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:mb-16 sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.dormitories.sub")}
          </p>
          <div className="mx-auto grid max-w-4xl gap-4 sm:gap-5">
            {items.map((k) => (
              <div
                key={k}
                className={cn(
                  glassCard(dark),
                  "rounded-xl px-4 py-4 sm:px-6 sm:py-4 flex items-start gap-3 text-[15px] font-normal leading-relaxed overflow-hidden min-w-0",
                  dark ? "text-white/80" : "text-slate-800"
                )}
              >
                <Check className={cn("h-5 w-5 shrink-0 mt-0.5", dark ? "text-indigo-400/80" : "text-indigo-600")} strokeWidth={2} />
                <span className="min-w-0 break-words">{t(k)}</span>
              </div>
            ))}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingWhiteLabel() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";
  const items = [
    "landing.home.whitelabel.item.1",
    "landing.home.whitelabel.item.2",
    "landing.home.whitelabel.item.3",
    "landing.home.whitelabel.item.4",
    "landing.home.whitelabel.item.5",
  ] as const;

  return (
    <section
      id="whitelabel"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark ? "border-white/[0.06] bg-[rgba(2,6,15,0.97)]" : "border-slate-200/80 bg-slate-50"
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
        <LandingReveal>
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-fuchsia-500/15 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
              )}
              aria-hidden
            >
              <Layers2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <p
            className={cn(
              "mb-4 text-center font-[var(--font-jakarta)] text-xs font-medium uppercase tracking-widest",
              dark ? "text-white/50" : "text-slate-500"
            )}
          >
            {t("landing.home.whitelabel.kicker")}
          </p>
          <h2
            className={cn(
              "mb-3 text-center font-[var(--font-playfair)] text-balance text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.1]",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.whitelabel.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-12 max-w-xl text-center font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:mb-16 sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.whitelabel.sub")}
          </p>
          <div className="mx-auto grid max-w-4xl gap-4 sm:gap-5">
            {items.map((k) => (
              <div
                key={k}
                className={cn(
                  glassCard(dark),
                  "rounded-xl px-4 py-4 sm:px-6 sm:py-4 flex items-start gap-3 text-[15px] font-normal leading-relaxed overflow-hidden min-w-0",
                  dark ? "text-white/80" : "text-slate-800"
                )}
              >
                <Check className={cn("h-5 w-5 shrink-0 mt-0.5", dark ? "text-fuchsia-400/80" : "text-fuchsia-600")} strokeWidth={2} />
                <span className="min-w-0 break-words">{t(k)}</span>
              </div>
            ))}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  const { t } = useLocalizationContext();
  const { theme } = useLandingTheme();
  const dark = theme === "dark";

  return (
    <section
      id="cta"
      data-landing-nav-bg="light"
      className={cn(
        "relative z-10 scroll-mt-24 border-t",
        dark
          ? "border-white/[0.08] bg-gradient-to-b from-slate-900/90 to-[rgb(2,6,15)]"
          : "border-slate-200/80 bg-gradient-to-b from-indigo-50/60 via-white/80 to-slate-50/90"
      )}
    >
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <LandingReveal>
          <div
            className={cn(
              glassCard(dark),
              "mx-auto rounded-3xl px-6 py-10 sm:px-10 sm:py-12 overflow-hidden min-w-0",
              dark ? "border-white/12 bg-white/[0.05]" : "border-slate-200/80 bg-white"
            )}
          >
          <div className="mb-4 flex justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-2xl p-3 shadow-sm",
                dark ? "bg-pink-500/15 text-pink-200" : "bg-pink-100 text-pink-800"
              )}
              aria-hidden
            >
              <Rocket className="h-5 w-5" strokeWidth={1.75} />
            </span>
          </div>
          <h2
            className={cn(
              "font-[var(--font-playfair)] text-balance text-3xl font-normal leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.1] mb-4",
              dark ? "text-white" : "text-slate-900"
            )}
          >
            {t("landing.home.cta.title")}
          </h2>
          <p
            className={cn(
              "mx-auto mb-9 max-w-lg font-[var(--font-jakarta)] text-base font-normal leading-relaxed sm:text-lg",
              dark ? "text-white/65" : "text-slate-600"
            )}
          >
            {t("landing.home.cta.sub")}
          </p>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className={cn(
                "inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl border px-8 text-[15px] font-semibold shadow-md backdrop-blur-md transition-colors",
                dark
                  ? "border-white/40 bg-white/90 text-slate-950 hover:bg-white"
                  : "border-slate-800/20 bg-slate-900/90 text-white hover:bg-slate-900"
              )}
            >
              {t("landing.home.cta.primary")}
            </Link>
            <Link
              href="/auth/signin"
              className={cn(
                "inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl border px-8 text-[15px] font-medium shadow-sm backdrop-blur-md transition-colors",
                dark
                  ? "border-white/30 bg-white/10 text-white hover:border-white/45 hover:bg-white/18"
                  : "border-white/70 bg-white/55 text-slate-900 hover:bg-white/75"
              )}
            >
              {t("landing.home.cta.secondary")}
            </Link>
            <Link
              href="/rentals"
              className={cn(
                "inline-flex min-h-12 touch-manipulation items-center justify-center rounded-2xl px-6 text-[15px] font-medium transition-colors",
                dark ? "text-white/65 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t("landing.home.cta.tertiary")}
            </Link>
          </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

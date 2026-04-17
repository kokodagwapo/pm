import { ArrowRight, Bot, Building2, Cloud, Code2, GraduationCap, Network, Sparkles, Users, Wrench } from "lucide-react";
import {
  landingAiItems,
  landingIntegrationItems,
  landingMigrationItems,
  landingRoles,
  landingScaleItems,
} from "@/components/landing/home/landing-content";

export function LandingHomeOperations() {
  return (
    <>
      <section id="connect" className="border-b border-slate-200/80 bg-slate-50/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Works with what you already use
              </p>
              <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
                Connect first, migrate in steps, and avoid a risky day-one cutover.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Hook up your CRM, accounting stack, older PM software, or custom systems.
                Bring data over in stages instead of forcing staff through one big flip.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {landingIntegrationItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Integration model
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                    Keep staff and residents out of unnecessary disruption
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    icon: Code2,
                    title: "APIs and webhooks",
                    description: "Connect operational data without waiting on a monolithic vendor roadmap.",
                  },
                  {
                    icon: Cloud,
                    title: "Flexible hosting",
                    description: "Run in your own cloud when custody matters, or stay on a managed setup.",
                  },
                  {
                    icon: Users,
                    title: "Human-guided migration",
                    description: "Move in phases your team can actually absorb and approve.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <item.icon className="h-5 w-5 text-sky-700" />
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="migrate" className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Smart helpers
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    AI where it actually helps
                  </h3>
                </div>
              </div>

              <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                No hype. Use automation and suggestions for boring work, faster replies,
                and cleaner data when you move systems.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {landingAiItems.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Migration
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    Onboarding that fits real life
                  </h3>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {landingMigrationItems.map((item) => (
                  <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/80 bg-slate-50/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Specialized for scale
              </p>
              <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
                Multi-building and dormitory management from one dashboard
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Manage dozens of buildings, shared facilities, and complex resident
                workflows without splitting teams across disconnected tools.
              </p>

              <div className="mt-8 space-y-3">
                {landingScaleItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 w-fit">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  Large resident workflows
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Bulk communications, shared-space scheduling, occupancy planning, and
                  utility allocation all stay inside one operational system.
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 w-fit">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  White-label property management platform
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  Agencies, real estate groups, and software platforms can resell
                  SmartStart with their own domain, brand, and client structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Who it serves
            </p>
            <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
              Each role sees what matters. Less back and forth.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {landingRoles.map((role, index) => {
              const icons = [Building2, Users, Wrench, Bot];
              const Icon = icons[index % icons.length];
              return (
                <div
                  key={role.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                    {role.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                    {role.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

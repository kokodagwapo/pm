"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, ChevronRight, ChevronLeft, Sparkles, RotateCcw } from "lucide-react";
import { UserRole } from "@/types";

interface TourStep {
  emoji: string;
  title: string;
  description: string;
  href?: string;
  color: string;
  bgColor: string;
  badge?: string;
}

const adminSteps: TourStep[] = [
  {
    emoji: "🚀",
    title: "Welcome, Super Admin!",
    description: "You have the keys to the kingdom! This tour will show you all the powerful tools at your disposal. Let's explore your command center.",
    color: "text-violet-700",
    bgColor: "bg-violet-50 border-violet-200",
    badge: "START HERE",
  },
  {
    emoji: "🏠",
    title: "Dashboard Overview",
    description: "Your mission control. At a glance: total properties, active tenants, pending maintenance, and monthly revenue. Everything you need before your morning coffee ☕.",
    href: "/dashboard",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    emoji: "🏢",
    title: "Properties",
    description: "Your full portfolio lives here. Add new properties, manage units, check availability, and keep every address in perfect order. Naples FL is just the beginning!",
    href: "/dashboard/properties",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  {
    emoji: "👥",
    title: "Tenants",
    description: "Every resident in one place. Review applications, onboard new tenants, and keep relationships healthy. Happy tenants = fewer headaches 😄.",
    href: "/dashboard/tenants",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
  {
    emoji: "📄",
    title: "Leases",
    description: "Create, track, and renew lease agreements without the paper pile. Get notified about expiring leases before they sneak up on you.",
    href: "/dashboard/leases",
    color: "text-sky-700",
    bgColor: "bg-sky-50 border-sky-200",
  },
  {
    emoji: "🔧",
    title: "Maintenance",
    description: "Turn chaos into calm. All repair requests — from a leaky faucet to a broken AC — are tracked, assigned, and resolved right here. No sticky notes required.",
    href: "/dashboard/maintenance",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    emoji: "💰",
    title: "Payments",
    description: "Money matters. Track rent collection, spot overdue accounts instantly, and keep your cash flow strong. Your accountant will thank you.",
    href: "/dashboard/payments",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    emoji: "📊",
    title: "Analytics",
    description: "Numbers don't lie. Dive deep into financial performance, occupancy rates, and maintenance trends. Great data makes great decisions.",
    href: "/dashboard/analytics",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
  {
    emoji: "⚙️",
    title: "Admin Panel",
    description: "Your exclusive superpower. Manage all users, assign roles, and control access across the entire platform. With great power comes great responsibility! 🦸",
    href: "/dashboard/admin",
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
    badge: "ADMIN ONLY",
  },
  {
    emoji: "🎉",
    title: "You're All Set!",
    description: "That's the full tour! You're now ready to run your property empire. Remember: this guide is always available at the bottom-right corner whenever you need a refresher.",
    color: "text-violet-700",
    bgColor: "bg-gradient-to-br from-violet-50 to-pink-50 border-violet-200",
    badge: "DONE!",
  },
];

const managerSteps: TourStep[] = [
  {
    emoji: "👋",
    title: "Hey, Property Manager!",
    description: "Ready to keep things running smoothly? This quick tour covers your daily toolkit. Buckle up — property management has never been this easy.",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    badge: "START HERE",
  },
  {
    emoji: "🏠",
    title: "Your Dashboard",
    description: "Start every day here. See open maintenance requests, upcoming lease renewals, and pending payments — all at a glance. Your daily briefing, no newspaper required.",
    href: "/dashboard",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  {
    emoji: "🏢",
    title: "Properties & Units",
    description: "Manage every property and unit you're responsible for. Add new listings, track vacancies, and keep units occupied. Empty units = opportunity!",
    href: "/dashboard/properties",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  {
    emoji: "👥",
    title: "Tenants & Applications",
    description: "From screening applicants to managing existing tenants — it's all here. Review applications, communicate, and build great tenant relationships.",
    href: "/dashboard/tenants",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
  {
    emoji: "📄",
    title: "Leases",
    description: "Never miss a renewal date again. Create leases, track active agreements, and get notified when things are about to expire. Future you says thanks.",
    href: "/dashboard/leases",
    color: "text-sky-700",
    bgColor: "bg-sky-50 border-sky-200",
  },
  {
    emoji: "🔧",
    title: "Maintenance Requests",
    description: "Your most-visited page. Prioritize, assign, and close out repairs efficiently. The emergency board keeps the urgent stuff front and center.",
    href: "/dashboard/maintenance",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    badge: "HIGH TRAFFIC",
  },
  {
    emoji: "💰",
    title: "Payments & Collections",
    description: "Know exactly who's paid and who hasn't. The overdue tracker saves you from awkward conversations — or makes sure you have them on time 😏.",
    href: "/dashboard/payments",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    emoji: "🎯",
    title: "You're Ready!",
    description: "That covers your key tools! Use the sidebar to navigate anytime, and tap this guide whenever you want a refresher. Go make those properties shine ✨.",
    color: "text-blue-700",
    bgColor: "bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200",
    badge: "DONE!",
  },
];

const ownerSteps: TourStep[] = [
  {
    emoji: "💼",
    title: "Welcome, Property Owner!",
    description: "Your investment portfolio is in good hands. This tour shows you exactly how to monitor your properties, income, and tenants — all without lifting a wrench.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    badge: "START HERE",
  },
  {
    emoji: "🏠",
    title: "Portfolio Dashboard",
    description: "Your financial snapshot. See occupancy rates, monthly revenue, and active leases at a glance. The numbers that matter, right where you need them.",
    href: "/dashboard",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    emoji: "🏢",
    title: "Your Properties",
    description: "Browse all your properties and units. See what's occupied, what's available, and how each property is performing. Your real estate empire, visualized.",
    href: "/dashboard/properties",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  {
    emoji: "📄",
    title: "Leases & Revenue",
    description: "Track every active lease, upcoming renewals, and rental income in one place. The invoices section shows exactly what's been billed and collected.",
    href: "/dashboard/leases",
    color: "text-sky-700",
    bgColor: "bg-sky-50 border-sky-200",
  },
  {
    emoji: "🔧",
    title: "Maintenance Visibility",
    description: "See all maintenance requests across your properties. You don't handle the repairs — but you should always know what's happening to protect your investment.",
    href: "/dashboard/maintenance",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    emoji: "📊",
    title: "Financial Analytics",
    description: "Your favorite section — the ROI view! Financial performance, occupancy trends, and maintenance costs broken down by property. Smart investing starts here.",
    href: "/dashboard/analytics",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    badge: "MUST SEE",
  },
  {
    emoji: "🏆",
    title: "Sit Back & Relax!",
    description: "Your properties are being managed professionally. Use this platform to stay informed, not overwhelmed. This guide is always here when you need it.",
    color: "text-emerald-700",
    bgColor: "bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200",
    badge: "DONE!",
  },
];

const tenantSteps: TourStep[] = [
  {
    emoji: "🏡",
    title: "Welcome Home!",
    description: "This is your personal tenant portal. Everything you need to manage your rental — from paying rent to requesting repairs — is right here. Let's take a quick look!",
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
    badge: "START HERE",
  },
  {
    emoji: "🗓️",
    title: "My Home Dashboard",
    description: "Your personal overview. See your lease status, upcoming rent due date, and any open maintenance requests. Everything important in one spot.",
    href: "/dashboard",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    emoji: "📄",
    title: "My Lease",
    description: "View your lease agreement, important dates, and rental details. Your documents are stored safely here — no more searching through emails for that PDF.",
    href: "/dashboard/leases/my-leases",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  {
    emoji: "💳",
    title: "Pay Rent Online",
    description: "No more checks or trips to the office! Pay your rent securely online in seconds. Your payment history is saved so you always have proof of payment.",
    href: "/dashboard/payments/pay-rent",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    badge: "PAY HERE",
  },
  {
    emoji: "🔧",
    title: "Submit a Repair Request",
    description: "Something needs fixing? Submit a maintenance request with a description (and photos if you have them). Your property manager gets it instantly and tracks it to completion.",
    href: "/dashboard/maintenance/new",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    emoji: "💬",
    title: "Messages",
    description: "Need to reach your property manager? Send a message directly through the portal. It's faster, more organized, and everything is documented. No more phone tag!",
    href: "/dashboard/messages",
    color: "text-sky-700",
    bgColor: "bg-sky-50 border-sky-200",
  },
  {
    emoji: "🎉",
    title: "You're All Set!",
    description: "That's everything you need to know! Your home sweet home is now fully managed through this portal. Tap the guide button anytime for a refresher. Welcome to the family! 💛",
    color: "text-rose-700",
    bgColor: "bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200",
    badge: "DONE!",
  },
];

function getStepsForRole(role?: string): TourStep[] {
  switch (role) {
    case UserRole.ADMIN:
      return adminSteps;
    case UserRole.MANAGER:
      return managerSteps;
    case UserRole.OWNER:
      return ownerSteps;
    case UserRole.TENANT:
      return tenantSteps;
    default:
      return adminSteps;
  }
}

function getRoleColor(role?: string) {
  switch (role) {
    case UserRole.ADMIN:
      return { dot: "bg-violet-500", ring: "ring-violet-400", text: "text-violet-600", light: "bg-violet-100" };
    case UserRole.MANAGER:
      return { dot: "bg-blue-500", ring: "ring-blue-400", text: "text-blue-600", light: "bg-blue-100" };
    case UserRole.OWNER:
      return { dot: "bg-emerald-500", ring: "ring-emerald-400", text: "text-emerald-600", light: "bg-emerald-100" };
    case UserRole.TENANT:
      return { dot: "bg-rose-500", ring: "ring-rose-400", text: "text-rose-600", light: "bg-rose-100" };
    default:
      return { dot: "bg-violet-500", ring: "ring-violet-400", text: "text-violet-600", light: "bg-violet-100" };
  }
}

const STORAGE_KEY_PREFIX = "demo_guide_v2_";

export function DemoGuide() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [mounted, setMounted] = useState(false);

  const userRole = session?.user?.role as string | undefined;
  const steps = getStepsForRole(userRole);
  const roleColors = getRoleColor(userRole);
  const storageKey = STORAGE_KEY_PREFIX + (userRole || "guest");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !userRole) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { step, completed } = JSON.parse(saved);
      setCurrentStep(step ?? 0);
      setHasCompleted(completed ?? false);
      if (!completed) {
        const timer = setTimeout(() => setShowPulse(true), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setShowPulse(true);
        setTimeout(() => setIsOpen(true), 800);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [mounted, userRole, storageKey]);

  const saveProgress = useCallback(
    (step: number, completed: boolean) => {
      localStorage.setItem(storageKey, JSON.stringify({ step, completed }));
    },
    [storageKey]
  );

  const goToStep = useCallback(
    (nextStep: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(nextStep);
        setIsAnimating(false);
        const isLast = nextStep === steps.length - 1;
        if (isLast) {
          setHasCompleted(true);
          saveProgress(nextStep, true);
        } else {
          saveProgress(nextStep, false);
        }
      }, 180);
    },
    [isAnimating, steps.length, saveProgress]
  );

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      setIsOpen(false);
    }
  }, [currentStep, steps.length, goToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    saveProgress(currentStep, currentStep === steps.length - 1);
  }, [currentStep, steps.length, saveProgress]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setHasCompleted(false);
    setIsOpen(true);
    saveProgress(0, false);
  }, [saveProgress]);

  const handleNavigate = useCallback(() => {
    const step = steps[currentStep];
    if (step.href) {
      router.push(step.href);
      setIsOpen(false);
    }
  }, [currentStep, steps, router]);

  if (!mounted || !userRole) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Floating launcher button */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Demo guide"
          className={cn(
            "relative w-12 h-12 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-white",
            "hover:scale-110 active:scale-95",
            roleColors.dot,
            isOpen && "scale-110 ring-4 ring-white shadow-xl"
          )}
        >
          {showPulse && !isOpen && !hasCompleted && (
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-60",
                roleColors.dot
              )}
            />
          )}
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </button>

        {/* Restart button — shown after completion */}
        {hasCompleted && !isOpen && (
          <button
            onClick={handleRestart}
            aria-label="Restart tour"
            className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all"
            title="Restart tour"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tour card */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          "bottom-36 right-4 lg:bottom-24 lg:right-6",
          "w-[min(340px,calc(100vw-2rem))]",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className={cn("h-full transition-all duration-500 rounded-full", roleColors.dot)}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Header */}
          <div className={cn("px-4 py-3 flex items-center justify-between border-b border-slate-100", roleColors.light)}>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-bold uppercase tracking-wider", roleColors.text)}>
                {userRole === UserRole.ADMIN && "Super Admin Tour"}
                {userRole === UserRole.MANAGER && "Manager Tour"}
                {userRole === UserRole.OWNER && "Owner Tour"}
                {userRole === UserRole.TENANT && "Tenant Tour"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                {currentStep + 1} / {steps.length}
              </span>
              <button
                onClick={handleClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Step content */}
          <div
            className={cn(
              "transition-all duration-180",
              isAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            )}
          >
            <div className={cn("p-4 border-b border-slate-100", step.bgColor, "border")}>
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0 select-none leading-none mt-0.5">
                  {step.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn("font-bold text-sm leading-tight", step.color)}>
                      {step.title}
                    </h3>
                    {step.badge && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          step.color,
                          "bg-white/60 border border-current/20"
                        )}
                      >
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Step dots */}
            <div className="px-4 py-2 flex items-center gap-1 justify-center">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    i === currentStep
                      ? cn("w-4 h-2", roleColors.dot)
                      : i < currentStep
                      ? cn("w-2 h-2", roleColors.dot, "opacity-60")
                      : "w-2 h-2 bg-slate-200"
                  )}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="px-4 pb-4 flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isFirst
                    ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                    : "text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {step.href && !isLast && (
                <button
                  onClick={handleNavigate}
                  className={cn(
                    "flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-all active:scale-95",
                    "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  Go there →
                </button>
              )}

              <button
                onClick={handleNext}
                className={cn(
                  "flex-1 text-xs font-semibold py-2 px-4 rounded-lg text-white transition-all active:scale-95 hover:opacity-90",
                  roleColors.dot
                )}
              >
                {isLast ? "Finish Tour 🎉" : "Next"}
              </button>

              <button
                onClick={handleNext}
                disabled={isLast}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isLast
                    ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                    : "text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tail pointing to button */}
        <div className="absolute -bottom-2 right-5 w-4 h-4 bg-white border-r border-b border-slate-200/80 rotate-45 shadow-sm" />
      </div>
    </>
  );
}

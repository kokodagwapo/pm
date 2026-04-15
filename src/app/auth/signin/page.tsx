"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCsrfToken, signIn } from "next-auth/react";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  heroGlassButtonPrimary,
  heroGlassInput,
  heroGlassPanel,
} from "@/components/auth/hero-glass";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Building2,
  Mail,
  Lock,
  AlertCircle,
  Home,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface Branding {
  logoLight: string;
  logoDark: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

const DEFAULT_BRANDING: Branding = {
  logoLight: "/images/logo-light.svg",
  logoDark: "/images/logo-dark.svg",
  favicon: "/favicon.ico",
  primaryColor: "#3B82F6",
  secondaryColor: "#64748B",
  companyName: "SmartStartPM",
};

/**
 * After credentials sign-in, Auth may return only the site root when NEXTAUTH_URL disagrees
 * with the browser host; "/" then redirects to sign-in again. Prefer the intended callback.
 */
function normalizePostLoginRedirectUrl(
  rawUrl: string,
  browserOrigin: string,
  fallbackAbsoluteUrl: string
): string {
  try {
    const u = new URL(rawUrl, browserOrigin);
    if (u.origin !== browserOrigin) {
      const o = new URL(browserOrigin);
      u.protocol = o.protocol;
      u.host = o.host;
    }
    const path = u.pathname || "/";
    if (path === "/" && !u.search) {
      return fallbackAbsoluteUrl;
    }
    return u.toString();
  } catch {
    return fallbackAbsoluteUrl;
  }
}

/** Ensure callbackUrl is a safe relative path (prevent open redirects). */
function safeCallbackUrl(input: string | null): string {
  if (!input || typeof input !== "string") return "/dashboard";
  const path = input.startsWith("/") ? input : `/${input}`;
  if (path.startsWith("//") || path.includes(":")) return "/dashboard";
  return path.startsWith("/dashboard") ? path : "/dashboard";
}

const DEMO_ACCOUNTS = [
  { role: "Admin",   email: "hi@smartstart.us",       password: "SmartStart2025", color: "from-violet-500/20 to-purple-500/20 border-violet-400/30 hover:border-violet-400/60", badge: "bg-violet-500/20 text-violet-200 border-violet-400/30" },
  { role: "Manager", email: "manager@smartstart.us",  password: "SmartStart2025", color: "from-sky-500/20 to-blue-500/20 border-sky-400/30 hover:border-sky-400/60",           badge: "bg-sky-500/20 text-sky-200 border-sky-400/30" },
  { role: "Owner",   email: "owner@smartstart.us",    password: "SmartStart2025", color: "from-emerald-500/20 to-teal-500/20 border-emerald-400/30 hover:border-emerald-400/60", badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" },
  { role: "Tenant",  email: "tenant@smartstart.us",   password: "SmartStart2025", color: "from-amber-500/20 to-orange-500/20 border-amber-400/30 hover:border-amber-400/60",   badge: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
];

function CredentialsSignInSection({
  t,
  isLoading,
  setIsLoading,
  setError,
  initialEmail,
  signInWithCredentials,
}: {
  t: (key: string) => string;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  setError: (v: string) => void;
  initialEmail: string;
  signInWithCredentials: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const target = await signInWithCredentials(email, password);
      if (target) {
        window.location.href = target;
      } else {
        setError(t("auth.signin.invalidCredentials"));
        setIsLoading(false);
      }
    } catch {
      setError(t("auth.signin.error"));
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setDemoLoading(account.role);
    setError("");
    try {
      const target = await signInWithCredentials(account.email, account.password);
      if (target) {
        window.location.href = target;
      } else {
        setError("Demo login failed — make sure demo accounts are seeded.");
        setDemoLoading(null);
      }
    } catch {
      setError(t("auth.signin.error"));
      setDemoLoading(null);
    }
  };

  return (
    <>
      <div className="mb-7">
        <h3 className="text-lg text-white tracking-wide" style={{ fontWeight: 300 }}>
          {t("auth.signin.welcomeBack")}
        </h3>
        <p className="mt-1 text-xs text-white/60 tracking-wide" style={{ fontWeight: 300 }}>
          {t("auth.signin.credentials")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs tracking-wide text-white/45"
            style={{ fontWeight: 300 }}
          >
            {t("auth.signin.emailLabel")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.signin.emailPlaceholder")}
              className={heroGlassInput}
              style={{ fontWeight: 300 }}
              required
              suppressHydrationWarning
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs tracking-wide text-white/45"
            style={{ fontWeight: 300 }}
          >
            {t("auth.signin.passwordLabel")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signin.passwordPlaceholder")}
              className={heroGlassInput}
              style={{ fontWeight: 300 }}
              required
              suppressHydrationWarning
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !!demoLoading}
          className={cn(
            heroGlassButtonPrimary,
            "mt-2 min-h-[46px] py-3 disabled:cursor-not-allowed disabled:opacity-40"
          )}
          style={{ fontWeight: 300 }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("auth.signin.signingIn")}
            </span>
          ) : (
            t("auth.signin.signIn")
          )}
        </button>
      </form>

      {/* Demo accounts */}
      <div className="mt-6">
        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            <Zap className="w-3 h-3" />
            Quick Demo Login
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              onClick={() => handleDemoLogin(account)}
              disabled={isLoading || !!demoLoading}
              className={cn(
                "relative flex flex-col items-start gap-1.5 px-3.5 py-3 rounded-2xl border bg-gradient-to-br transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden",
                account.color
              )}
            >
              {demoLoading === account.role && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                </div>
              )}
              <span className={cn("text-[9px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-lg border", account.badge)}>
                {account.role}
              </span>
              <span className="text-[11px] text-white/60 truncate w-full text-left" style={{ fontWeight: 300 }}>
                {account.email}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-white/20 tracking-wide" style={{ fontWeight: 300 }}>
          Demo only — password: SmartStart2025
        </p>
      </div>
    </>
  );
}

function SignInContent() {
  const searchParams = useSearchParams();
  const { t } = useLocalizationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>("");
  const registered = searchParams.get("registered") === "1";
  const initialEmail = searchParams.get("email") || "";

  useEffect(() => {
    // Pre-fetch branding and CSRF token in parallel so neither blocks the other
    Promise.all([
      fetch("/api/branding/public")
        .then((r) => r.json())
        .then((result) => {
          if (result.success && result.data) setBranding(result.data);
        })
        .catch(() => {}),
      getCsrfToken()
        .then((t) => { if (t) setCsrfToken(t); })
        .catch(() => {}),
    ]);
  }, []);

  // Remove stale Auth.js error query (bookmark / failed attempt) so it does not confuse users
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("error")) return;
    params.delete("error");
    const next = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next ? `?${next}` : ""}`
    );
  }, []);

  /**
   * Same request shape as next-auth/react `signIn("credentials")` (X-Auth-Return-Redirect + JSON body).
   * Fallback runs when the library returns an error (e.g. MissingCSRF) so cookies are always sent with `credentials: "include"`.
   * CSRF token is pre-fetched on page load to avoid an extra round-trip here.
   */
  const signInCredentialsWithFallback = async (
    loginEmail: string,
    loginPassword: string
  ): Promise<string | null> => {
    const callbackPath = safeCallbackUrl(searchParams.get("callbackUrl"));
    const callbackUrl = `${window.location.origin}${callbackPath}`;

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
      callbackUrl,
    });

    if (!result?.error && result?.ok) {
      const rawUrl = result.url ?? callbackUrl;
      return normalizePostLoginRedirectUrl(
        rawUrl,
        window.location.origin,
        callbackUrl
      );
    }

    // Use pre-loaded token; fall back to a fresh fetch only if not yet ready
    const token = csrfToken || (await getCsrfToken());
    if (!token) return null;

    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        email: loginEmail,
        password: loginPassword,
        csrfToken: token,
        callbackUrl,
      }),
    });

    let data: { url?: string } = {};
    try {
      data = await res.json();
    } catch {
      return null;
    }

    if (!data.url || !res.ok) return null;

    let authError: string | null = null;
    let normalizedUrl = data.url;
    try {
      const u = new URL(data.url, window.location.origin);
      authError = u.searchParams.get("error");
      // Keep the user on the current domain (custom domain support)
      if (u.origin !== window.location.origin) {
        u.protocol = window.location.protocol;
        u.host = window.location.host;
      }
      normalizedUrl = u.toString();
    } catch {
      return null;
    }

    if (authError) return null;
    return normalizePostLoginRedirectUrl(
      normalizedUrl,
      window.location.origin,
      callbackUrl
    );
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-auto" suppressHydrationWarning>
      <HeroVideo />
      {/* Elegant gradient overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.38) 42%, rgba(0,0,0,0.72) 100%)",
        }}
        aria-hidden
      />

      {/* Language switcher — top right corner */}
      <div className="fixed top-4 right-4 z-20">
        <LanguageSwitcher variant="dark" align="right" />
      </div>

      <div className="fixed left-4 top-4 z-20 sm:left-6">
        <Link
          href="/"
          className="inline-flex h-9 min-h-[36px] touch-manipulation items-center gap-2 rounded-2xl border border-white/15 px-3.5 text-xs tracking-wide text-white/65 transition-colors hover:border-white/30 hover:text-white/95"
          style={{ fontWeight: 400 }}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("auth.signin.backToHome")}
        </Link>
      </div>

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12">
        <div className="w-full max-w-[440px] space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center items-center">
              {logoError ? (
                <Building2 className="h-12 w-12 text-white/80" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoLight}
                  alt={branding.companyName}
                  width={160}
                  height={48}
                  className="h-11 w-auto max-w-40 object-contain"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <h2
              className="mt-7 text-3xl sm:text-4xl text-white tracking-tight"
              style={{ fontWeight: 200 }}
            >
              {t("auth.signin.title")}
            </h2>
            <p
              className="mt-2 text-sm text-white/40 tracking-wide"
              style={{ fontWeight: 300 }}
            >
              {t("auth.signin.subtitle")}
            </p>
          </div>

          {/* Match LanguageSwitcher (dark) trigger: outline only at rest, hover:bg-white/10 */}
          <div className={cn(heroGlassPanel, "sm:p-8")}>
            {registered && !error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100 backdrop-blur-md backdrop-saturate-125 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {t("auth.signin.registeredSuccess")}
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 p-3 text-xs text-red-100 backdrop-blur-md backdrop-saturate-125 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <CredentialsSignInSection
              t={t}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              setError={setError}
              initialEmail={initialEmail}
              signInWithCredentials={signInCredentialsWithFallback}
            />

            <p
              className="mt-5 text-center text-xs tracking-wide text-white/45"
              style={{ fontWeight: 300 }}
            >
              {t("auth.signin.needAccount")}{" "}
              <Link
                href="/auth/signup"
                className="text-white/80 transition-colors hover:text-white"
              >
                {t("auth.signin.createAccount")}
              </Link>
            </p>
          </div>

          {/* View Rentals + stay finder */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="/rentals"
              className="inline-flex items-center gap-2 h-[42px] px-7 rounded-2xl border border-white/15 text-white/50 text-xs tracking-wide hover:border-white/30 hover:text-white/80 transition-all duration-300"
              style={{ fontWeight: 300 }}
            >
              <Home className="h-3.5 w-3.5" />
              {t("auth.signin.viewRentals")}
            </a>
            <a
              href="/all-in-one-calendar"
              className="inline-flex items-center gap-2 h-[42px] px-7 rounded-2xl border border-white/15 text-white/50 text-xs tracking-wide hover:border-white/30 hover:text-white/80 transition-all duration-300"
              style={{ fontWeight: 300 }}
            >
              <Calendar className="h-3.5 w-3.5" />
              {t("auth.signin.checkAvailability")}
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" /></div>}>
      <SignInContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCsrfToken, signIn } from "next-auth/react";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { DemoLeadForm } from "@/components/auth/DemoLeadForm";
import { getDemoLead, type DemoLead } from "@/lib/demo-lead-storage";
import {
  Loader2,
  Building2,
  Mail,
  Lock,
  AlertCircle,
  Zap,
  Shield,
  Users,
  Home,
  ArrowLeft,
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

/** Ensure callbackUrl is a safe relative path (prevent open redirects). */
function safeCallbackUrl(input: string | null): string {
  if (!input || typeof input !== "string") return "/dashboard";
  const path = input.startsWith("/") ? input : `/${input}`;
  if (path.startsWith("//") || path.includes(":")) return "/dashboard";
  return path.startsWith("/dashboard") ? path : "/dashboard";
}

/** Set `true` to show email/password sign-in again (e.g. production). Hidden during demo-first UX. */
const SHOW_CREDENTIALS_SIGN_IN = false;

function CredentialsSignInSection({
  t,
  demoAccountsReady,
  isLoading,
  setIsLoading,
  setError,
  signInWithCredentials,
}: {
  t: (key: string) => string;
  demoAccountsReady: boolean;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  setError: (v: string) => void;
  signInWithCredentials: (email: string, password: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
              className="w-full min-h-[40px] pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/10 transition-all touch-manipulation"
              style={{ fontWeight: 300 }}
              required
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
              className="w-full min-h-[40px] pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/10 transition-all touch-manipulation"
              style={{ fontWeight: 300 }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !demoAccountsReady}
          className="w-full min-h-[46px] py-3 rounded-xl text-sm tracking-wide text-white bg-white/12 hover:bg-white/20 border border-white/20 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation mt-2"
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
  const [demoAccountsReady, setDemoAccountsReady] = useState(false);
  const [savedDemoLead, setSavedDemoLead] = useState<DemoLead | null>(null);
  const [demoLeadGatePassed, setDemoLeadGatePassed] = useState(false);

  useEffect(() => {
    const existing = getDemoLead();
    if (existing) {
      setSavedDemoLead(existing);
      setDemoLeadGatePassed(true);
    }
  }, []);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch("/api/branding/public");
        const result = await response.json();
        if (result.success && result.data) {
          setBranding(result.data);
        }
      } catch {
        // Keep default branding on error
      }
    };
    fetchBranding();
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

  // Ensure demo users exist in MongoDB (Docker/local) so Dev Quick Login works without running setup:local
  useEffect(() => {
    fetch("/api/setup/ensure-demo", { credentials: "include" })
      .catch(() => {})
      .finally(() => setDemoAccountsReady(true));
  }, []);

  /**
   * Same request shape as next-auth/react `signIn("credentials")` (X-Auth-Return-Redirect + JSON body).
   * Fallback runs when the library returns an error (e.g. MissingCSRF) so cookies are always sent with `credentials: "include"`.
   */
  const signInCredentialsWithFallback = async (
    loginEmail: string,
    loginPassword: string
  ): Promise<string | null> => {
    await fetch("/api/setup/ensure-demo", { credentials: "include" }).catch(
      () => {}
    );

    const callbackPath = safeCallbackUrl(searchParams.get("callbackUrl"));
    const callbackUrl = `${window.location.origin}${callbackPath}`;

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
      callbackUrl,
    });

    if (!result?.error && result?.ok) {
      // Normalize the returned URL to the current origin so custom domains
      // (e.g. pm.smarts.fi) are preserved instead of being swapped to the
      // Replit deployment URL.
      const rawUrl = result.url ?? callbackPath;
      try {
        const u = new URL(rawUrl, window.location.origin);
        if (u.origin !== window.location.origin) {
          u.protocol = window.location.protocol;
          u.host = window.location.host;
        }
        return u.toString();
      } catch {
        return rawUrl;
      }
    }

    const csrfToken = await getCsrfToken();
    if (!csrfToken) return null;

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
        csrfToken,
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
    return normalizedUrl;
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setIsLoading(true);
    setError("");
    try {
      const target = await signInCredentialsWithFallback(
        demoEmail,
        demoPassword
      );
      if (target) {
        window.location.href = target;
      } else {
        setError(t("auth.signin.loginFailed"));
        setIsLoading(false);
      }
    } catch {
      setError(t("auth.signin.error"));
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { label: "Super Admin", role: "admin", email: "hi@smartstart.us", password: "SmartStart2025", icon: Shield, color: "bg-red-500/90 hover:bg-red-600/90" },
    { label: "Manager", role: "manager", email: "manager@smartstart.us", password: "SmartStart2025", icon: Users, color: "bg-blue-500/90 hover:bg-blue-600/90" },
    { label: "Owner", role: "owner", email: "owner@smartstart.us", password: "SmartStart2025", icon: Building2, color: "bg-purple-500/90 hover:bg-purple-600/90" },
    { label: "Tenant", role: "tenant", email: "tenant@smartstart.us", password: "SmartStart2025", icon: Home, color: "bg-green-500/90 hover:bg-green-600/90" },
  ];

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-auto" suppressHydrationWarning>
      <HeroVideo />
      {/* Elegant gradient overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.48) 40%, rgba(0,0,0,0.82) 100%)",
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
          <div className="rounded-xl border border-white/20 bg-transparent p-6 sm:p-8 text-white/80 transition-all duration-300 hover:bg-white/10">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/20 p-3 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {SHOW_CREDENTIALS_SIGN_IN && (
              <CredentialsSignInSection
                t={t}
                demoAccountsReady={demoAccountsReady}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
                signInWithCredentials={signInCredentialsWithFallback}
              />
            )}

            {/* Quick Login — gated behind name / phone / email (stored in localStorage) */}
            <div
              className={
                SHOW_CREDENTIALS_SIGN_IN ? "mt-7 border-t border-white/20 pt-6" : ""
              }
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-3.5 w-3.5 text-amber-400/80" />
                <span
                  className="text-xs tracking-wide text-white/40"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signin.devQuickLogin")}
                </span>
                {!demoAccountsReady && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white/35" aria-hidden />
                )}
              </div>
              <DemoLeadForm
                t={t}
                savedLead={savedDemoLead}
                onSaved={(lead) => {
                  setSavedDemoLead(lead);
                  setDemoLeadGatePassed(true);
                }}
                onCleared={() => {
                  setSavedDemoLead(null);
                  setDemoLeadGatePassed(false);
                }}
              />
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${!demoLeadGatePassed ? "opacity-35" : ""}`}>
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleQuickLogin(account.email, account.password)}
                    disabled={isLoading || !demoAccountsReady || !demoLeadGatePassed}
                    className={`flex flex-col items-center justify-center gap-1.5 min-h-[52px] py-3 rounded-xl text-white text-[11px] tracking-wide transition-all touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${account.color}`}
                    style={{ fontWeight: 300 }}
                  >
                    <account.icon className="h-3.5 w-3.5" />
                    {account.label}
                  </button>
                ))}
              </div>
              <p
                className="text-[10px] text-white/25 mt-2.5 text-center tracking-wide"
                style={{ fontWeight: 300 }}
              >
                {demoLeadGatePassed
                  ? t("auth.signin.devClickToLogin")
                  : t("auth.signin.demoLead.unlockHint")}
              </p>
            </div>
          </div>

          {/* View Rentals */}
          <div className="text-center">
            <a
              href="/rentals"
              className="inline-flex items-center gap-2 h-[42px] px-7 rounded-2xl border border-white/15 text-white/50 text-xs tracking-wide hover:border-white/30 hover:text-white/80 transition-all duration-300"
              style={{ fontWeight: 300 }}
            >
              <Home className="h-3.5 w-3.5" />
              {t("auth.signin.viewRentals")}
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

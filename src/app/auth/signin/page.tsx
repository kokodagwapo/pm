"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCsrfToken, signIn } from "next-auth/react";
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

const DEMO_ROLES = [
  { role: "superadmin", label: "Super Admin", color: "border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/10" },
  { role: "manager",    label: "PM Manager",  color: "border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10" },
  { role: "owner",      label: "Owner",       color: "border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-500/10" },
  { role: "tenant",     label: "Tenant",      color: "border-amber-500/30 hover:border-amber-400/50 hover:bg-amber-500/10" },
];

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

function safeCallbackUrl(input: string | null): string {
  if (!input || typeof input !== "string") return "/dashboard";
  const path = input.startsWith("/") ? input : `/${input}`;
  if (path.startsWith("//") || path.includes(":")) return "/dashboard";
  return path.startsWith("/dashboard") ? path : "/dashboard";
}

function getDemoLoginCredentials(
  searchParams: URLSearchParams
): { email: string; password: string } | null {
  if (searchParams.get("demo") !== "1") return null;
  const role = searchParams.get("role") || searchParams.get("type") || "superadmin";
  if (role === "superadmin" || role === "admin") {
    return { email: "superadmin@smartstartpm.com", password: "Sspm!Super2026" };
  }
  if (role === "manager") {
    return { email: "pmadmin@smartstartpm.com", password: "Sspm!Manager2026" };
  }
  if (role === "owner") {
    return { email: "owner@smartstartpm.com", password: "Sspm!Owner2026" };
  }
  if (role === "tenant") {
    return { email: "tenant@smartstartpm.com", password: "Sspm!Tenant2026" };
  }
  return null;
}

function CredentialsForm({
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs tracking-wide text-white/45" style={{ fontWeight: 300 }}>
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
        <label htmlFor="password" className="block text-xs tracking-wide text-white/45" style={{ fontWeight: 300 }}>
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
        disabled={isLoading}
        className={cn(heroGlassButtonPrimary, "mt-2 min-h-[46px] py-3 disabled:cursor-not-allowed disabled:opacity-40")}
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
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const { t } = useLocalizationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState(false);

  const registered = searchParams.get("registered") === "1";
  const initialEmail = searchParams.get("email") || "";

  const demoEmail = useRef(searchParams.get("demo") === "1" ? getDemoLoginCredentials(searchParams)?.email ?? null : null);
  const demoPassword = useRef(searchParams.get("demo") === "1" ? getDemoLoginCredentials(searchParams)?.password ?? null : null);
  const demoAttempted = useRef(false);

  useEffect(() => {
    fetch("/api/branding/public")
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data) setBranding(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!demoEmail.current || !demoPassword.current || demoAttempted.current) return;
    demoAttempted.current = true;
    const params = new URLSearchParams(window.location.search);
    params.delete("demo");
    params.delete("role");
    params.delete("type");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    void (async () => {
      setError("");
      setIsLoading(true);
      const target = await doSignIn(demoEmail.current!, demoPassword.current!);
      if (target) {
        window.location.href = target;
        return;
      }
      setError("Demo login failed — please try again or sign in manually.");
      setIsLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("error")) return;
    params.delete("error");
    const next = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
  }, []);

  const doSignIn = async (loginEmail: string, loginPassword: string): Promise<string | null> => {
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
      return normalizePostLoginRedirectUrl(rawUrl, window.location.origin, callbackUrl);
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
      body: new URLSearchParams({ email: loginEmail, password: loginPassword, csrfToken, callbackUrl }),
    });

    let data: { url?: string } = {};
    try { data = await res.json(); } catch { return null; }
    if (!data.url || !res.ok) return null;

    let authError: string | null = null;
    let normalizedUrl = data.url;
    try {
      const u = new URL(data.url, window.location.origin);
      authError = u.searchParams.get("error");
      if (u.origin !== window.location.origin) {
        u.protocol = window.location.protocol;
        u.host = window.location.host;
      }
      normalizedUrl = u.toString();
    } catch { return null; }

    if (authError) return null;
    return normalizePostLoginRedirectUrl(normalizedUrl, window.location.origin, callbackUrl);
  };

  return (
    <div className="w-full max-w-[440px] space-y-6 sm:space-y-8">
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
        <h2 className="mt-7 text-3xl sm:text-4xl text-white tracking-tight" style={{ fontWeight: 200 }}>
          {t("auth.signin.title")}
        </h2>
        <p className="mt-2 text-sm text-white/40 tracking-wide" style={{ fontWeight: 300 }}>
          {t("auth.signin.subtitle")}
        </p>
      </div>

      <div className={cn(heroGlassPanel, "sm:p-8")}>
        {registered && !error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100 backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("auth.signin.registeredSuccess")}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 p-3 text-xs text-red-100 backdrop-blur-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-7">
          <h3 className="text-lg text-white tracking-wide" style={{ fontWeight: 300 }}>
            {t("auth.signin.welcomeBack")}
          </h3>
          <p className="mt-1 text-xs text-white/60 tracking-wide" style={{ fontWeight: 300 }}>
            {t("auth.signin.credentials")}
          </p>
        </div>

        <CredentialsForm
          t={t}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setError={setError}
          initialEmail={initialEmail}
          signInWithCredentials={doSignIn}
        />

        <p className="mt-5 text-center text-xs tracking-wide text-white/45" style={{ fontWeight: 300 }}>
          {t("auth.signin.needAccount")}{" "}
          <Link href="/auth/signup" className="text-white/80 transition-colors hover:text-white">
            {t("auth.signin.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const { t } = useLocalizationContext();

  return (
    <div className="min-h-screen overflow-auto bg-slate-950" suppressHydrationWarning>
      {/* Static gradient background — no video, no z-index problems */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950/80 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_80%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      {/* Top-left: back button */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="inline-flex h-9 min-h-[36px] touch-manipulation items-center gap-2 rounded-2xl border border-white/15 px-3.5 text-xs tracking-wide text-white/65 transition-colors hover:border-white/30 hover:text-white/95"
          style={{ fontWeight: 400 }}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("auth.signin.backToHome")}
        </Link>
        <LanguageSwitcher variant="dark" align="right" />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-8" style={{ minHeight: "calc(100vh - 64px)" }}>

        <Suspense fallback={
          <div className="w-full max-w-[440px] flex flex-col items-center gap-8">
            <div className="h-11 w-40 rounded-lg bg-white/10 animate-pulse" />
            <div className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-8 space-y-4">
              <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-white/10 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-white/10 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-white/15 animate-pulse" />
            </div>
          </div>
        }>
          <SignInForm />
        </Suspense>

        {/* Demo buttons — always visible, no Suspense needed */}
        <div className="mt-6 w-full max-w-[440px] space-y-2.5">
          <p className="text-center text-[10px] tracking-widest text-white/30 uppercase" style={{ fontWeight: 400 }}>
            Or try a live demo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map(({ role, label, color }) => (
              <a
                key={role}
                href={`/auth/signin?demo=1&role=${role}`}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border bg-white/[0.04] text-xs tracking-wide text-white/55 transition-all duration-200 hover:text-white/90",
                  color
                )}
                style={{ fontWeight: 300 }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* View Rentals + Availability */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

      </main>
    </div>
  );
}

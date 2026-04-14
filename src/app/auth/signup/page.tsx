"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCsrfToken, signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  heroGlassButtonPrimary,
  heroGlassInput,
  heroGlassPanel,
} from "@/components/auth/hero-glass";
import { cn } from "@/lib/utils";

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

interface RegisterResponse {
  success?: boolean;
  message?: string;
  data?: {
    message?: string;
  };
}

function SignupContent() {
  const searchParams = useSearchParams();
  const { t } = useLocalizationContext();
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

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

  const signInWithFallback = async (
    email: string,
    password: string
  ): Promise<string | null> => {
    const callbackPath = safeCallbackUrl(searchParams.get("callbackUrl"));
    const callbackUrl = `${window.location.origin}${callbackPath}`;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!result?.error && result?.ok) {
      return normalizePostLoginRedirectUrl(
        result.url ?? callbackUrl,
        window.location.origin,
        callbackUrl
      );
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
        email,
        password,
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

    try {
      const u = new URL(data.url, window.location.origin);
      if (u.searchParams.get("error")) return null;
      if (u.origin !== window.location.origin) {
        u.protocol = window.location.protocol;
        u.host = window.location.host;
      }
      return normalizePostLoginRedirectUrl(
        u.toString(),
        window.location.origin,
        callbackUrl
      );
    } catch {
      return null;
    }
  };

  const updateField =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError(t("auth.signup.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: "tenant",
        }),
      });

      const result = (await response.json()) as RegisterResponse;

      if (!response.ok || !result.success) {
        setError(
          result?.message ||
            result?.data?.message ||
            t("auth.signup.registrationFailed")
        );
        setIsLoading(false);
        return;
      }

      setSuccess(t("auth.signup.success"));

      const target = await signInWithFallback(form.email, form.password);
      if (target) {
        window.location.href = target;
        return;
      }

      window.location.href = `/auth/signin?registered=1&email=${encodeURIComponent(
        form.email
      )}`;
    } catch {
      setError(t("auth.signup.registrationFailed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-auto bg-slate-950" suppressHydrationWarning>
      {/* Static gradient background */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950/80 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_80%,rgba(99,102,241,0.10),transparent_50%)]" />
      </div>

      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <Link
          href="/auth/signin"
          className="inline-flex h-9 min-h-[36px] touch-manipulation items-center gap-2 rounded-2xl border border-white/15 px-3.5 text-xs tracking-wide text-white/65 transition-colors hover:border-white/30 hover:text-white/95"
          style={{ fontWeight: 400 }}
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("auth.signup.backToSignIn")}
        </Link>
        <LanguageSwitcher variant="dark" align="right" />
      </div>

      <main className="relative z-10 flex items-center justify-center px-4 py-8 sm:px-6" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="w-full max-w-[440px] space-y-6 sm:space-y-8">
          <div className="text-center">
            <div className="flex justify-center items-center">
              {logoError ? (
                <Building2 className="h-12 w-12 text-white/80" />
              ) : (
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
              {t("auth.signup.title")}
            </h2>
            <p
              className="mt-2 text-sm text-white/40 tracking-wide"
              style={{ fontWeight: 300 }}
            >
              {t("auth.signup.subtitle")}
            </p>
          </div>

          <div className={cn(heroGlassPanel, "sm:p-8")}>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 p-3 text-xs text-red-100 backdrop-blur-md backdrop-saturate-125 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100 backdrop-blur-md backdrop-saturate-125 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="firstName"
                    className="block text-xs tracking-wide text-white/45"
                    style={{ fontWeight: 300 }}
                  >
                    {t("auth.signup.firstName")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={updateField("firstName")}
                      placeholder={t("auth.signup.firstNamePlaceholder")}
                      className={heroGlassInput}
                      style={{ fontWeight: 300 }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="lastName"
                    className="block text-xs tracking-wide text-white/45"
                    style={{ fontWeight: 300 }}
                  >
                    {t("auth.signup.lastName")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={updateField("lastName")}
                      placeholder={t("auth.signup.lastNamePlaceholder")}
                      className={heroGlassInput}
                      style={{ fontWeight: 300 }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs tracking-wide text-white/45"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signup.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder={t("auth.signup.emailPlaceholder")}
                    className={heroGlassInput}
                    style={{ fontWeight: 300 }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="block text-xs tracking-wide text-white/45"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signup.phone")}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField("phone")}
                    placeholder={t("auth.signup.phonePlaceholder")}
                    className={heroGlassInput}
                    style={{ fontWeight: 300 }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs tracking-wide text-white/45"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signup.password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={updateField("password")}
                    placeholder={t("auth.signup.passwordPlaceholder")}
                    className={heroGlassInput}
                    style={{ fontWeight: 300 }}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs tracking-wide text-white/45"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signup.confirmPassword")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={updateField("confirmPassword")}
                    placeholder={t("auth.signup.confirmPasswordPlaceholder")}
                    className={heroGlassInput}
                    style={{ fontWeight: 300 }}
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  heroGlassButtonPrimary,
                  "mt-2 min-h-[46px] py-3 disabled:cursor-not-allowed"
                )}
                style={{ fontWeight: 300 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("auth.signup.creatingAccount")}
                  </span>
                ) : (
                  t("auth.signup.submit")
                )}
              </button>
            </form>

            <p
              className="mt-5 text-center text-xs tracking-wide text-white/45"
              style={{ fontWeight: 300 }}
            >
              {t("auth.signup.haveAccount")}{" "}
              <Link
                href="/auth/signin"
                className="text-white/80 transition-colors hover:text-white"
              >
                {t("auth.signup.signInInstead")}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

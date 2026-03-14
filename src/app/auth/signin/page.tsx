"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
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

const glassCard = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const glassInput = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
};

export default function SignInPage() {
  const { t } = useLocalizationContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [logoError, setLogoError] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth.signin.invalidCredentials"));
        setIsLoading(false);
      } else if (result?.ok) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      }
    } catch {
      setError(t("auth.signin.error"));
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
      });

      if (result?.error) {
        console.warn("signIn returned error, trying direct approach:", result.error);

        const csrfRes = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfRes.json();

        const callbackRes = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email: demoEmail,
            password: demoPassword,
            csrfToken: csrfToken,
            json: "true",
          }),
          redirect: "follow",
        });

        if (callbackRes.ok || callbackRes.redirected) {
          window.location.href = "/dashboard";
        } else {
          setError(t("auth.signin.loginFailed"));
          setIsLoading(false);
        }
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/dashboard";
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
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.65) 100%)",
        }}
        aria-hidden
      />

      {/* Language switcher — top right corner */}
      <div className="fixed top-4 right-4 z-20">
        <LanguageSwitcher variant="dark" align="right" />
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

          {/* Glassmorphic Sign In Card */}
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={glassCard}
          >
            <div className="mb-7">
              <h3
                className="text-lg text-white tracking-wide"
                style={{ fontWeight: 300 }}
              >
                {t("auth.signin.welcomeBack")}
              </h3>
              <p
                className="mt-1 text-xs text-white/35 tracking-wide"
                style={{ fontWeight: 300 }}
              >
                {t("auth.signin.credentials")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

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
                    className="w-full min-h-[46px] pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/25 transition-all"
                    style={{ ...glassInput, fontWeight: 300 }}
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
                    className="w-full min-h-[46px] pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/25 transition-all"
                    style={{ ...glassInput, fontWeight: 300 }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
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

            {/* Quick Login */}
            <div className="mt-7 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-amber-400/80" />
                <span
                  className="text-xs tracking-wide text-white/40"
                  style={{ fontWeight: 300 }}
                >
                  {t("auth.signin.devQuickLogin")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleQuickLogin(account.email, account.password)}
                    disabled={isLoading}
                    className={`flex flex-col items-center justify-center gap-1.5 min-h-[52px] py-3 rounded-xl text-white text-[11px] tracking-wide transition-all touch-manipulation ${account.color}`}
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
                {t("auth.signin.devClickToLogin")}
              </p>
            </div>
          </div>

          {/* View Rentals */}
          <div className="text-center">
            <a
              href="/rentals"
              className="inline-flex items-center gap-2 h-[42px] px-7 rounded-full border border-white/15 text-white/50 text-xs tracking-wide hover:border-white/30 hover:text-white/80 transition-all duration-300"
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

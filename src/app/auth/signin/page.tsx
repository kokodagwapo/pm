"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { HeroVideo } from "@/components/landing/HeroVideo";
import { LandingHeader } from "@/components/landing/LandingHeader";
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

const glassCard = {
  background: "rgba(255,255,255,0.12)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInput = {
  background: "rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

export default function SignInPage() {
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
        setError("Invalid email or password");
        setIsLoading(false);
      } else if (result?.ok) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      }
    } catch {
      setError("An error occurred during sign in");
      setIsLoading(false);
    }
  };

  const handleDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.hostname === "localhost");

  const demoAccounts = [
    { label: "Super Admin", email: "hi@smartstart.us", password: "Admin123$", icon: Shield, color: "bg-red-500/90 hover:bg-red-600/90" },
    { label: "Manager", email: "manager@smartstart.us", password: "Manager123$", icon: Users, color: "bg-blue-500/90 hover:bg-blue-600/90" },
    { label: "Owner", email: "owner@smartstart.us", password: "Owner123$", icon: Building2, color: "bg-purple-500/90 hover:bg-purple-600/90" },
    { label: "Tenant", email: "tenant@smartstart.us", password: "Tenant123$", icon: Home, color: "bg-green-500/90 hover:bg-green-600/90" },
  ];

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-auto bg-slate-900">
      {/* Video background - same as landing hero */}
      <HeroVideo />

      {/* Header */}
      <LandingHeader />

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-24">
        <div className="w-full max-w-lg space-y-8 animate-fade-in-up">
          {/* Header */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/20 border border-white/20 mb-6 transition-all text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back to Home
            </Link>
            <div className="flex justify-center items-center">
              {logoError ? (
                <Building2 className="h-14 w-14 text-white/90" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoLight}
                  alt={branding.companyName}
                  width={160}
                  height={48}
                  className="h-12 w-auto max-w-40 object-contain brightness-0 invert"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <h2
              className="mt-6 text-3xl font-[var(--font-playfair)] font-bold text-white drop-shadow-lg"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
            >
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-white/80 font-[var(--font-montserrat)]">
              Manage your properties with ease
            </p>
          </div>

          {/* Glassmorphic Sign In Card */}
          <div
            className="rounded-2xl p-6 md:p-8 transition-all duration-300"
            style={glassCard}
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white font-[var(--font-montserrat)]">
                Welcome back
              </h3>
              <p className="mt-1 text-sm text-white/80">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-100 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-white/90">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all"
                    style={glassInput}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white/90">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all"
                    style={glassInput}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-medium text-white bg-white/20 hover:bg-white/30 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Development Quick Login */}
            {isDevelopment && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-white/80">
                    Dev Quick Login
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      className={`flex flex-col items-center gap-1 h-auto py-2 rounded-lg text-white text-xs font-medium transition-all ${account.color}`}
                      onClick={() =>
                        handleDemoCredentials(account.email, account.password)
                      }
                      disabled={isLoading}
                    >
                      <account.icon className="h-4 w-4" />
                      {account.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/60 mt-2 text-center">
                  Click to auto-fill credentials, then sign in
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-white/70">
            <Link href="/" className="hover:text-white underline underline-offset-2">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

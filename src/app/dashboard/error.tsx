"use client";

import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
  Shield,
  Database,
  Wifi,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function getErrorContext(error: Error) {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("unauthorized") || message.includes("session")) {
    return {
      icon: Shield,
      title: "Session Expired",
      description: "Your session has expired or you're not authorized to access this dashboard.",
      action: "Please sign in again to continue.",
    };
  }
  if (message.includes("network") || message.includes("fetch")) {
    return {
      icon: Wifi,
      title: "Connection Issue",
      description: "Unable to load dashboard data due to a network error.",
      action: "Check your connection and try again.",
    };
  }
  if (message.includes("database") || message.includes("data")) {
    return {
      icon: Database,
      title: "Data Loading Error",
      description: "We're having trouble loading your dashboard data.",
      action: "This is usually temporary. Please try again.",
    };
  }
  return {
    icon: AlertCircle,
    title: "Dashboard Error",
    description: "An unexpected error occurred while loading your dashboard.",
    action: "Try refreshing the page or contact support if the issue persists.",
  };
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  if (!error?.message) return null;

  const errorContext = getErrorContext(error);
  const ErrorIcon = errorContext.icon;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-2xl w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <ErrorIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{errorContext.title}</h2>
              <p className="mt-0.5 text-sm text-white/70">{errorContext.description}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorContext.action}
          </div>

          {process.env.NODE_ENV === "development" && error.message && (
            <details>
              <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="font-semibold text-slate-600">Message: </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200">{error.message}</code>
                </div>
                {error.stack && (
                  <pre className="mt-2 p-3 bg-white rounded overflow-auto max-h-48 border border-slate-200 text-slate-500">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
            <a
              href="mailto:hi@smartstart.us"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <MessageSquare className="size-4" />
              Contact Us
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="javascript:history.back()"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" />
              Go Back
            </a>
            <a
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LayoutDashboard className="size-4" />
              Dashboard Home
            </a>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3">Quick access</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link href="/dashboard/properties" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100">Properties</Link>
              <Link href="/dashboard/tenants" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100">Tenants</Link>
              <Link href="/dashboard/maintenance" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100">Maintenance</Link>
              <Link href="/dashboard/settings" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100">Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

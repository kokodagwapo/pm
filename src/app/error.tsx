"use client";

import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function getErrorInfo(error: Error) {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return {
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection and try again.",
    };
  }
  if (message.includes("unauthorized") || message.includes("authentication")) {
    return {
      title: "Authentication Error",
      description: "Your session may have expired. Please sign in again.",
    };
  }
  if (message.includes("database") || message.includes("mongo")) {
    return {
      title: "Database Error",
      description: "We're having trouble accessing the database. This is usually temporary.",
    };
  }
  return {
    title: "Something Went Wrong",
    description: error.message || "An unexpected error occurred while processing your request.",
  };
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  if (!error?.message) return null;

  const errorInfo = getErrorInfo(error);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white shadow-xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-50 p-3">
              <AlertCircle className="size-8 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{errorInfo.title}</h1>
          <p className="text-slate-500 text-sm leading-relaxed">{errorInfo.description}</p>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          Try refreshing the page or going back to the previous page.
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <details className="mt-2">
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

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
          <a
            href="javascript:history.back()"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </a>
          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Home className="size-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

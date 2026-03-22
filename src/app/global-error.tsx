"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface GlobalErrorProps {
  error?: Error & { digest?: string };
  reset?: () => void;
}

const MAX_AUTO_RETRIES = 3;
const MAX_SESSION_AUTO_RECOVERIES = 12;
const SESSION_TOTAL_KEY = "__smartstart_global_err_session_total";

/**
 * Survives GlobalError remounts after `reset()` — useRef does not, which caused
 * infinite retry loops on Replit / slow webpack dev.
 */
let transientRetryCountForFingerprint = 0;
let lastErrorFingerprint = "";

function fingerprintError(error: unknown): string {
  try {
    if (error == null) return "__null__";
    if (typeof error !== "object") return `v:${String(error).slice(0, 160)}`;
    const e = error as Record<string, unknown>;
    const digest = e.digest;
    if (digest != null && String(digest)) return `d:${String(digest)}`;
    const message = e.message;
    if (message != null && String(message)) return `m:${String(message).slice(0, 160)}`;
    const keys = Object.keys(e).sort().join(",");
    return keys ? `k:${keys}` : "__empty_object__";
  } catch {
    return "__fp_error__";
  }
}

function safeLower(s: unknown): string {
  try {
    if (s == null) return "";
    const t = typeof s === "string" ? s : String(s);
    return t.toLowerCase();
  } catch {
    return "";
  }
}

function isTransientDevError(error: unknown): boolean {
  try {
    if (error == null) return true;

    if (typeof error === "object" && error !== null && Object.keys(error as object).length === 0) {
      return true;
    }

    const msg = safeLower(
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: unknown }).message
        : undefined
    );
    const stack = safeLower(
      typeof error === "object" && error !== null && "stack" in error
        ? (error as { stack?: unknown }).stack
        : undefined
    );

    if (stack) {
      if (stack.includes("options.factory")) return true;
      if (stack.includes("webpack_require")) return true;
      if (stack.includes("webpack") && msg.includes("reading 'call'")) return true;
      if (stack.includes("chunkloaderror")) return true;
      if (stack.includes("loading chunk")) return true;
    }

    if (msg) {
      if (msg.includes("hydration")) return true;
      if (msg.includes("server rendered html")) return true;
      if (msg.includes("text content does not match")) return true;
      if (msg.includes("invalid hook call")) return true;
      if (msg.includes("minified react error")) return true;
      if (msg.includes("$refreshreg$")) return true;
      if (msg.includes("dynamically imported module")) return true;
      if (msg.includes("failed to fetch dynamically imported module")) return true;
    }

    return false;
  } catch {
    return true;
  }
}

function bumpSessionRecoveryTotal(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = parseInt(sessionStorage.getItem(SESSION_TOTAL_KEY) || "0", 10) + 1;
    sessionStorage.setItem(SESSION_TOTAL_KEY, String(n));
    return n;
  } catch {
    return MAX_SESSION_AUTO_RECOVERIES;
  }
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showUI, setShowUI] = useState(false);
  const resetRef = useRef(reset);
  resetRef.current = reset;

  useEffect(() => {
    const fp = fingerprintError(error);
    if (fp !== lastErrorFingerprint) {
      lastErrorFingerprint = fp;
      transientRetryCountForFingerprint = 0;
    }

    const isTransient = isTransientDevError(error);
    const isDev = process.env.NODE_ENV === "development";

    if (isDev && isTransient) {
      const sessionTotal = parseInt(
        typeof window !== "undefined"
          ? sessionStorage.getItem(SESSION_TOTAL_KEY) || "0"
          : "0",
        10
      );
      if (sessionTotal >= MAX_SESSION_AUTO_RECOVERIES) {
        setShowUI(true);
        return;
      }

      if (transientRetryCountForFingerprint < MAX_AUTO_RETRIES) {
        transientRetryCountForFingerprint += 1;
        bumpSessionRecoveryTotal();
        const delay = 500 * transientRetryCountForFingerprint;
        const timer = setTimeout(() => {
          try {
            resetRef.current?.();
          } catch {
            setShowUI(true);
          }
        }, delay);
        return () => clearTimeout(timer);
      }

      try {
        if (typeof window !== "undefined") {
          const key = "__smartstart_reload";
          const count = parseInt(sessionStorage.getItem(key) || "0", 10);
          if (count < 2) {
            bumpSessionRecoveryTotal();
            sessionStorage.setItem(key, String(count + 1));
            window.location.reload();
            return;
          }
          sessionStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    }

    setShowUI(true);
  }, [error]);

  if (!showUI) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Loading - SmartStartPM</title>
        </head>
        <body style={{ margin: 0, background: "#f9fafb" }} />
      </html>
    );
  }

  const devMessage =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - SmartStartPM</title>
        <style>{`
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;color:#1f2937}
          .c{background:#fff;border-radius:1rem;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);max-width:42rem;width:100%;overflow:hidden}
          .h{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:2rem;text-align:center;color:#fff}
          .ic{display:inline-flex;align-items:center;justify-content:center;width:5rem;height:5rem;background:rgba(255,255,255,.2);border-radius:50%;margin-bottom:1rem}
          .h h1{font-size:2rem;font-weight:700;margin-bottom:.5rem}
          .h p{font-size:1rem;opacity:.95}
          .ct{padding:2rem}
          .al{background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;padding:1rem;margin-bottom:1.5rem}
          .at{font-weight:600;color:#991b1b;margin-bottom:.5rem}
          .ad{color:#7f1d1d;font-size:.875rem;line-height:1.5}
          .ed{background:#f9fafb;border:1px solid #e5e7eb;border-radius:.5rem;padding:1rem;margin-bottom:1.5rem}
          .ed summary{cursor:pointer;font-weight:500;color:#4b5563}
          .ec{background:#1f2937;color:#f3f4f6;padding:1rem;border-radius:.375rem;font-family:'Courier New',monospace;font-size:.75rem;overflow-x:auto;margin-top:.75rem;white-space:pre-wrap;word-break:break-all}
          .ac{display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem}
          @media(min-width:640px){.ac{flex-direction:row}}
          .b{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.75rem 1.5rem;border-radius:.5rem;font-weight:500;font-size:.875rem;cursor:pointer;transition:all .2s;text-decoration:none;border:none;flex:1}
          .bp{background:#667eea;color:#fff}.bp:hover{background:#5568d3}
          .bs{background:#f3f4f6;color:#1f2937;border:1px solid #d1d5db}.bs:hover{background:#e5e7eb}
        `}</style>
      </head>
      <body>
        <div className="c">
          <div className="h">
            <div className="ic">
              <AlertTriangle style={{ width: "3rem", height: "3rem" }} />
            </div>
            <h1>Application Error</h1>
            <p>Something went wrong while loading the application</p>
          </div>
          <div className="ct">
            <div className="al">
              <div className="at">What happened?</div>
              <div className="ad">
                An error occurred in the application. This is usually caused by a
                configuration issue, network problem, or temporary server error.
              </div>
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="ed">
                <details>
                  <summary>Technical Details</summary>
                  <div className="ec">
                    <div>
                      <strong>Error:</strong> {devMessage || "(no message — often a transient dev/build glitch)"}
                    </div>
                    {error &&
                      typeof error === "object" &&
                      "digest" in error &&
                      (error as { digest?: string }).digest && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <strong>Digest:</strong> {(error as { digest: string }).digest}
                        </div>
                      )}
                    {error &&
                      typeof error === "object" &&
                      "stack" in error &&
                      (error as { stack?: string }).stack && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <strong>Stack:</strong> {(error as { stack: string }).stack}
                        </div>
                      )}
                  </div>
                </details>
              </div>
            )}
            <div className="ac">
              <button
                onClick={() => {
                  try {
                    resetRef.current?.();
                  } catch {
                    /* ignore */
                  }
                }}
                className="b bs"
              >
                <RefreshCw style={{ width: "1rem", height: "1rem" }} />
                Try Again
              </button>
              <a href="/" className="b bp">
                <Home style={{ width: "1rem", height: "1rem" }} />
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

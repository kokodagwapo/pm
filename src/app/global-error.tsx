"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { isReplitHosted } from "@/lib/replit-host";
import {
  MAX_AUTO_RETRIES,
  MAX_SESSION_AUTO_RECOVERIES,
  SESSION_TOTAL_KEY,
  LAST_FP_KEY,
  RETRY_COUNT_KEY,
  geTransientRetry,
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  fingerprintError,
  isBareEmptyErrorPayload,
  isTransientDevError,
  bumpSessionRecoveryTotal,
} from "@/lib/global-error-logic";

interface GlobalErrorProps {
  error?: Error & { digest?: string };
  reset?: () => void;
}

/** Inline icons only — avoid importing lucide (chunk load failures would break this page). */
function IconAlert({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  );
}

function IconRefresh({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconHome({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />
    </svg>
  );
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showUI, setShowUI] = useState(false);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  /** Fast-path retries for empty payloads (before sessionStorage). */
  const fastEmptyRecoveryRef = useRef(0);

  useEffect(() => {
    try {
      const transient = isTransientDevError(error);
      const allowAutoRecover =
        process.env.NODE_ENV === "development" ||
        isBareEmptyErrorPayload(error) ||
        isReplitHosted();

      // Empty / unknown boundary payloads: reset immediately (no sessionStorage, no microtask).
      if (
        allowAutoRecover &&
        transient &&
        isBareEmptyErrorPayload(error) &&
        fastEmptyRecoveryRef.current < MAX_AUTO_RETRIES
      ) {
        fastEmptyRecoveryRef.current += 1;
        try {
          resetRef.current?.();
        } catch {
          setShowUI(true);
        }
        return;
      }

      const fp = fingerprintError(error);
      if (fp !== geTransientRetry.fingerprint) {
        geTransientRetry.fingerprint = fp;
        geTransientRetry.count = 0;
        safeSessionSet(LAST_FP_KEY, fp);
        safeSessionSet(RETRY_COUNT_KEY, "0");
      }

      let transientRetryCountForFingerprint = 0;
      try {
        const raw = safeSessionGet(RETRY_COUNT_KEY);
        const parsed = parseInt(raw || "0", 10);
        if (!Number.isNaN(parsed)) {
          transientRetryCountForFingerprint = parsed;
        }
      } catch {
        // Use default value
      }
      transientRetryCountForFingerprint = Math.max(transientRetryCountForFingerprint, geTransientRetry.count);

      if (allowAutoRecover && transient) {
        let sessionTotal = 0;
        try {
          const raw = safeSessionGet(SESSION_TOTAL_KEY);
          const parsed = parseInt(raw || "0", 10);
          if (!Number.isNaN(parsed)) {
            sessionTotal = parsed;
          }
        } catch {
          // Use default value
        }

        if (sessionTotal >= MAX_SESSION_AUTO_RECOVERIES) {
          setShowUI(true);
          return;
        }

        if (transientRetryCountForFingerprint < MAX_AUTO_RETRIES) {
          const next = transientRetryCountForFingerprint + 1;
          geTransientRetry.count = next;
          safeSessionSet(RETRY_COUNT_KEY, String(next));
          bumpSessionRecoveryTotal();
          const delay = 500 * next;
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
          const key = "__smartstart_reload";
          let count = 0;
          try {
            const raw = safeSessionGet(key);
            const parsed = parseInt(raw || "0", 10);
            if (!Number.isNaN(parsed)) {
              count = parsed;
            }
          } catch {
            // Use default value
          }
          if (count < 2) {
            bumpSessionRecoveryTotal();
            safeSessionSet(key, String(count + 1));
            window.location.reload();
            return;
          }
          safeSessionRemove(key);
        } catch {
          // ignore
        }
      }

      setShowUI(true);
    } catch {
      setShowUI(true);
    }
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
              <IconAlert style={{ width: "3rem", height: "3rem" }} />
            </div>
            <h1>Application Error</h1>
            <p>Something went wrong while loading the application</p>
          </div>
          <div className="ct">
            <div className="al">
              <div className="at">What happened?</div>
              <div className="ad">
                An error occurred in the application. This is usually caused by a configuration issue, network
                problem, or temporary server error.
              </div>
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="ed">
                <details>
                  <summary>Technical Details</summary>
                  <div className="ec">
                    <div>
                      <strong>Error:</strong>{" "}
                      {devMessage || "(no message — often a transient dev/build glitch or empty error payload)"}
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
                type="button"
                onClick={() => {
                  try {
                    resetRef.current?.();
                  } catch {
                    /* ignore */
                  }
                }}
                className="b bs"
              >
                <IconRefresh style={{ width: "1rem", height: "1rem" }} />
                Try Again
              </button>
              <a href="/" className="b bp">
                <IconHome style={{ width: "1rem", height: "1rem" }} />
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

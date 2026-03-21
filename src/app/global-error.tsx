"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const MAX_AUTO_RETRIES = 3;

function isTransientDevError(error: any): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = (error?.message || "").toString().toLowerCase();
  const stack = (error?.stack || "").toString().toLowerCase();
  return (
    stack.includes("options.factory") ||
    stack.includes("webpack_require") ||
    (msg.includes("reading 'call'") && stack.includes("webpack")) ||
    msg.includes("hydration") ||
    msg.includes("server rendered html") ||
    msg.includes("text content does not match") ||
    msg.includes("invalid hook call") ||
    msg.includes("minified react error") ||
    msg.includes("$refreshreg$")
  );
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const retryCount = useRef(0);
  const [showUI, setShowUI] = useState(false);

  useEffect(() => {
    const isTransient = isTransientDevError(error);

    if (isTransient) {
      if (retryCount.current < MAX_AUTO_RETRIES) {
        retryCount.current += 1;
        const timer = setTimeout(() => reset(), 500 * retryCount.current);
        return () => clearTimeout(timer);
      }
      if (typeof window !== "undefined") {
        const key = "__smartstart_reload";
        const count = parseInt(sessionStorage.getItem(key) || "0", 10);
        if (count < 2) {
          sessionStorage.setItem(key, String(count + 1));
          window.location.reload();
          return;
        }
        sessionStorage.removeItem(key);
      }
    }

    setShowUI(true);
  }, [error, reset]);

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
                    <div><strong>Error:</strong> {error?.message || "Unknown error"}</div>
                    {error?.digest && (
                      <div style={{ marginTop: "0.5rem" }}><strong>Digest:</strong> {error.digest}</div>
                    )}
                    {error?.stack && (
                      <div style={{ marginTop: "0.5rem" }}><strong>Stack:</strong> {error.stack}</div>
                    )}
                  </div>
                </details>
              </div>
            )}
            <div className="ac">
              <button onClick={() => reset()} className="b bp">
                <RefreshCw style={{ width: "1rem", height: "1rem" }} />
                Try Again
              </button>
              <a href="/" className="b bs">
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

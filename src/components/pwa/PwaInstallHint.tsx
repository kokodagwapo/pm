"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/providers/BrandingProvider";

/** Default favicon in branding is .ico — use SVG mark for a crisp banner tile. */
const DEFAULT_VECTOR_LOGO = "/favicon.svg";
const DEFAULT_BRANDING_FAVICON = "/favicon.ico";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "smartstart-pwa-install-dismissed";

/**
 * Shows a compact install banner when the browser fires beforeinstallprompt (Chromium).
 * Hidden in standalone display mode and after user dismisses (sessionStorage).
 */
export function PwaInstallHint({
  className,
  variant = "dark",
}: {
  className?: string;
  /** Match dashboard appearance (immersive vs light). */
  variant?: "dark" | "light";
}) {
  const { branding } = useBranding();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [standalone, setStandalone] = useState(false);

  const logoSrc = useMemo(() => {
    const f = branding.favicon?.trim();
    if (!f || f === DEFAULT_BRANDING_FAVICON) return DEFAULT_VECTOR_LOGO;
    return f;
  }, [branding.favicon]);
  const iconFallbackDone = useRef(false);

  useEffect(() => {
    iconFallbackDone.current = false;
  }, [logoSrc]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const check = () => setStandalone(mq.matches);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  useEffect(() => {
    if (standalone || process.env.NODE_ENV === "development") return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* private mode */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [standalone]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDeferred(null);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }, [deferred, dismiss]);

  if (!visible || !deferred) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-[60] md:left-auto md:right-6 md:max-w-sm",
        className
      )}
      role="status"
    >
      <div
        className={cn(
          "relative flex items-start gap-3 rounded-2xl border p-4 pr-10 shadow-2xl backdrop-blur-xl [-webkit-backdrop-filter:blur(20px)]",
          variant === "light"
            ? "border-white/40 bg-white/30 text-slate-900 shadow-slate-200/25"
            : "border-white/20 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 text-white shadow-black/40"
        )}
      >
        <div
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg",
            variant === "light"
              ? "bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-200/90 shadow-blue-900/[0.08]"
              : "bg-gradient-to-br from-blue-600 to-indigo-600 ring-1 ring-white/25 shadow-blue-900/25"
          )}
          aria-hidden
        >
          <Download
            className={cn(
              "h-6 w-6",
              variant === "light" ? "text-blue-600" : "text-white"
            )}
          />
        </div>
        <div
          className={cn(
            "min-w-0 flex-1 text-sm",
            variant === "light" ? "text-slate-900" : "text-white/95"
          )}
        >
          <p className={cn("font-semibold leading-tight", variant === "light" ? "text-slate-950" : "text-white")}>
            Install SmartStartPM
          </p>
          <p
            className={cn(
              "mt-1 text-xs font-light leading-relaxed",
              variant === "light" ? "text-slate-700" : "text-white/85"
            )}
          >
            Add to your home screen for quick access and a full-screen experience.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-9 touch-manipulation" onClick={install}>
              Install
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-9 touch-manipulation font-medium",
                variant === "light"
                  ? "text-slate-700 hover:bg-white/50 hover:text-slate-900"
                  : "text-white/80 hover:bg-white/15 hover:text-white"
              )}
              onClick={dismiss}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "absolute right-2 top-2 shrink-0 rounded-lg p-1.5 transition backdrop-blur-md",
            variant === "light"
              ? "text-slate-600 hover:bg-white/40 hover:text-slate-800"
              : "text-white/70 hover:bg-white/15 hover:text-white"
          )}
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

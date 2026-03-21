"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [standalone, setStandalone] = useState(false);

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
          "flex items-start gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur-md",
          variant === "light"
            ? "border-slate-200/90 bg-white/95 text-slate-900"
            : "dashboard-ui-surface border-white/15 bg-slate-950/90 dark:bg-slate-950/85"
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 text-sm",
            variant === "light" ? "text-slate-800" : "text-white/90"
          )}
        >
          <p className={cn("font-medium", variant === "light" ? "text-slate-900" : "text-white")}>
            Install SmartStartPM
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs font-light",
              variant === "light" ? "text-slate-600" : "text-white/70"
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
                "h-9 touch-manipulation",
                variant === "light"
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
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
            "shrink-0 rounded-full p-1 transition",
            variant === "light"
              ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              : "text-white/60 hover:bg-white/10 hover:text-white"
          )}
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

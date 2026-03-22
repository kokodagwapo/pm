"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

interface FlickeringGridBackgroundProps {
  className?: string;
  /** Marketing landing: light page vs dark page background */
  variant?: "default" | "landing-light" | "landing-dark";
}

/**
 * Full-viewport FlickeringGrid background, theme-aware.
 * Uses a mounted guard so server-render and first client-render both
 * produce identical HTML (empty container), preventing hydration mismatch.
 */
export function FlickeringGridBackground({
  className,
  variant = "default",
}: FlickeringGridBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLandingLight = variant === "landing-light";
  const isLandingDark = variant === "landing-dark";
  const color = isLandingLight
    ? "#94a3b8"
    : isLandingDark
      ? "#64748b"
      : resolvedTheme === "dark"
        ? "#94a3b8"
        : "#64748b";
  const maxOpacity = isLandingLight ? 0.1 : isLandingDark ? 0.12 : 0.18;

  const bgClass = isLandingLight ? "bg-slate-50" : isLandingDark ? "bg-slate-950" : "bg-background";

  return (
    <div className={`fixed inset-0 z-0 overflow-hidden ${bgClass} ${className ?? ""}`} aria-hidden>
      {mounted && (
        <FlickeringGrid
          className="absolute inset-0 size-full"
          squareSize={2}
          gridGap={10}
          color={color}
          maxOpacity={maxOpacity}
          flickerChance={isLandingLight ? 0.04 : isLandingDark ? 0.05 : 0.06}
        />
      )}
    </div>
  );
}

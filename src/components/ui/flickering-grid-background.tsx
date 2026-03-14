"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

interface FlickeringGridBackgroundProps {
  className?: string;
}

/**
 * Full-viewport FlickeringGrid background, theme-aware.
 * Uses a mounted guard so server-render and first client-render both
 * produce identical HTML (empty container), preventing hydration mismatch.
 */
export function FlickeringGridBackground({ className }: FlickeringGridBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const color = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <div
      className={`fixed inset-0 z-0 overflow-hidden bg-background ${className ?? ""}`}
      aria-hidden
    >
      {mounted && (
        <FlickeringGrid
          className="absolute inset-0 size-full"
          squareSize={2}
          gridGap={10}
          color={color}
          maxOpacity={0.18}
          flickerChance={0.06}
        />
      )}
    </div>
  );
}

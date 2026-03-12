"use client";

import { useTheme } from "next-themes";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

interface FlickeringGridBackgroundProps {
  className?: string;
}

/**
 * Full-viewport FlickeringGrid background, theme-aware.
 * Use as fixed background behind landing and dashboard content.
 */
export function FlickeringGridBackground({ className }: FlickeringGridBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const color = (resolvedTheme ?? "light") === "dark" ? "#94a3b8" : "#64748b";

  return (
    <div
      className={`fixed inset-0 z-0 overflow-hidden bg-background ${className ?? ""}`}
      aria-hidden
    >
      <FlickeringGrid
        className="absolute inset-0 size-full"
        squareSize={4}
        gridGap={6}
        color={color}
        maxOpacity={0.4}
        flickerChance={0.1}
      />
    </div>
  );
}

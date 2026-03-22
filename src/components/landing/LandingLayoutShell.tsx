"use client";

import { cn } from "@/lib/utils";
import { FlickeringGridBackground } from "@/components/ui/flickering-grid-background";
import { LandingThemeProvider, useLandingTheme } from "@/components/landing/LandingThemeProvider";

function LandingThemeBody({ children }: { children: React.ReactNode }) {
  const { theme } = useLandingTheme();

  return (
    <div
      className={cn(
        "relative min-h-screen font-[var(--font-montserrat)] antialiased",
        theme === "light" ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-50"
      )}
    >
      <FlickeringGridBackground variant={theme === "light" ? "landing-light" : "landing-dark"} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function LandingLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingThemeProvider>
      <LandingThemeBody>{children}</LandingThemeBody>
    </LandingThemeProvider>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

export function LandingReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-revealed={revealed ? "true" : "false"}
      className={cn("landing-reveal", className)}
    >
      {children}
    </div>
  );
}

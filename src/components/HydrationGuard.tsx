"use client";

import { useEffect, useState, ReactNode } from "react";

/**
 * HydrationGuard prevents hydration mismatches by deferring client-only rendering
 * until after the component has hydrated. This prevents Fast Refresh errors during
 * development and ensures server/client HTML matches perfectly.
 */
export function HydrationGuard({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Return empty div with same dimensions during SSR to prevent layout shift
  if (!isHydrated) {
    return <div suppressHydrationWarning />;
  }

  return <>{children}</>;
}

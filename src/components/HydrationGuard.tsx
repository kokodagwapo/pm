"use client";

import { ReactNode } from "react";

/**
 * HydrationGuard — pass-through wrapper.
 * Previously deferred all rendering until after hydration, which caused blank
 * pages and "Critical Application Error: {}" on every Fast Refresh cycle.
 * Individual components that need client-only rendering should use their own
 * useEffect/useState guards instead of blocking the entire tree.
 */
export function HydrationGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

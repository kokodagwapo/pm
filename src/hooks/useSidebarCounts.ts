/**
 * SmartStartPM - Optimized Sidebar Counts Hook
 * Lightweight hook with smart caching and reduced API calls
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface SidebarCounts {
  applications: number;
  expiringLeases: number;
  emergencyMaintenance: number;
  overduePayments: number;
}

interface UseSidebarCountsReturn {
  counts: SidebarCounts;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultCounts: SidebarCounts = {
  applications: 0,
  expiringLeases: 0,
  emergencyMaintenance: 0,
  overduePayments: 0,
};

const CACHE_KEY = "smartstart-sidebar-counts";
const CACHE_DURATION = 60000; // 1 minute cache

function getCachedCounts(): { counts: SidebarCounts; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { counts, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return { counts, timestamp };
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedCounts(counts: SidebarCounts) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ counts, timestamp: Date.now() }));
  } catch {
    // Ignore cache errors
  }
}

export function useSidebarCounts(
  options: {
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
): UseSidebarCountsReturn {
  const { refreshInterval = 60000, enabled = true } = options; // Default 60 seconds (was 30)
  const { status } = useSession();

  const [counts, setCounts] = useState<SidebarCounts>(() => {
    const cached = getCachedCounts();
    return cached?.counts || defaultCounts;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const isAuthenticated = status === "authenticated";

  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated || !enabled || fetchingRef.current) return;

    const cached = getCachedCounts();
    if (cached) {
      setCounts(cached.counts);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/sidebar/counts", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      if (data.success && data.data && mountedRef.current) {
        setCounts(data.data);
        setCachedCounts(data.data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [isAuthenticated, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;

    fetchCounts();

    const interval = setInterval(fetchCounts, refreshInterval);
    return () => clearInterval(interval);
  }, [isAuthenticated, enabled, refreshInterval, fetchCounts]);

  useEffect(() => {
    const handleRefresh = () => {
      sessionStorage.removeItem(CACHE_KEY);
      fetchCounts();
    };

    const events = ["sidebar-counts-refresh", "application-submitted", "lease-updated", "maintenance-updated", "payment-updated"];
    events.forEach((event) => window.addEventListener(event, handleRefresh));
    return () => events.forEach((event) => window.removeEventListener(event, handleRefresh));
  }, [fetchCounts]);

  return { counts, loading, error, refetch: fetchCounts };
}

export const refreshSidebarCounts = () => {
  sessionStorage.removeItem(CACHE_KEY);
  window.dispatchEvent(new CustomEvent("sidebar-counts-refresh"));
};

export const refreshApplicationCounts = refreshSidebarCounts;
export const refreshLeaseCounts = refreshSidebarCounts;
export const refreshMaintenanceCounts = refreshSidebarCounts;
export const refreshPaymentCounts = refreshSidebarCounts;
export const debouncedRefreshSidebarCounts = refreshSidebarCounts;
export const useSidebarRefreshTriggers = () => {};

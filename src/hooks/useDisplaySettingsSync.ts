/**
 * SmartStartPM - Optimized Display Settings Sync Hook
 * Lightweight hook with smart caching
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface DisplaySettings {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  branding: {
    logoLight: string;
    logoDark: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

interface SyncState {
  isOnline: boolean;
  lastSync: Date | null;
  syncError: string | null;
  hasConflict: boolean;
}

const CACHE_KEY = "smartstart-display-settings";
const CACHE_DURATION = 300000; // 5 minutes

function getCachedSettings(): DisplaySettings | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { settings, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return settings;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

function setCachedSettings(settings: DisplaySettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ settings, timestamp: Date.now() }));
  } catch {
    // Ignore
  }
}

export function useDisplaySettingsSync(options: {
  pollInterval?: number;
  autoResolveConflicts?: boolean;
  onSettingsChange?: (settings: DisplaySettings) => void;
} = {}) {
  const { pollInterval = 120000, onSettingsChange } = options; // 2 minutes (was 30s)

  const { data: session } = useSession();
  const [settings, setSettings] = useState<DisplaySettings | null>(() => getCachedSettings());
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastSync: null,
    syncError: null,
    hasConflict: false,
  });

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchSettings = useCallback(async () => {
    if (!session?.user?.id || fetchingRef.current) return null;

    const cached = getCachedSettings();
    if (cached) {
      setSettings(cached);
      return cached;
    }

    fetchingRef.current = true;

    try {
      const response = await fetch("/api/settings/display?includeDefaults=false", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = await response.json();
      const payload = raw?.data ?? raw;
      const fetchedSettings = payload?.settings ?? payload?.display ?? payload;

      if (fetchedSettings && mountedRef.current) {
        setSettings(fetchedSettings);
        setCachedSettings(fetchedSettings);
        setSyncState((prev) => ({ ...prev, lastSync: new Date(), syncError: null }));
        onSettingsChange?.(fetchedSettings);
        return fetchedSettings;
      }
    } catch (error) {
      if (mountedRef.current) {
        setSyncState((prev) => ({
          ...prev,
          syncError: error instanceof Error ? error.message : "Failed to fetch",
        }));
      }
    } finally {
      fetchingRef.current = false;
    }
    return null;
  }, [session?.user?.id, onSettingsChange]);

  const syncSettings = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !syncState.isOnline) return;

    fetchSettings();

    const interval = setInterval(fetchSettings, pollInterval);
    return () => clearInterval(interval);
  }, [session?.user?.id, syncState.isOnline, pollInterval, fetchSettings]);

  useEffect(() => {
    const handleOnline = () => setSyncState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    settings,
    syncState,
    updateLocalSettings: (newSettings: Partial<DisplaySettings>) => {
      if (settings) {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        setCachedSettings(updated);
        onSettingsChange?.(updated);
      }
    },
    syncSettings,
    resolveConflictManually: () => {},
    hasUnsavedChanges: false,
  };
}

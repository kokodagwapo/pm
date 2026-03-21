"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "smartstart-dashboard-appearance";

export type DashboardAppearance = "immersive" | "light";

type DashboardAppearanceContextValue = {
  appearance: DashboardAppearance;
  setAppearance: (value: DashboardAppearance) => void;
  isLight: boolean;
};

const DashboardAppearanceContext =
  createContext<DashboardAppearanceContextValue | null>(null);

export function DashboardAppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<DashboardAppearance>("immersive");

  useLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DashboardAppearance | null;
    const next: DashboardAppearance =
      stored === "light" || stored === "immersive" ? stored : "immersive";
    setAppearanceState(next);
    document.documentElement.classList.toggle("dashboard-light", next === "light");
    return () => {
      document.documentElement.classList.remove("dashboard-light");
    };
  }, []);

  const setAppearance = useCallback((value: DashboardAppearance) => {
    setAppearanceState(value);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.classList.toggle("dashboard-light", value === "light");
  }, []);

  const value = useMemo(
    () => ({
      appearance,
      setAppearance,
      isLight: appearance === "light",
    }),
    [appearance, setAppearance]
  );

  return (
    <DashboardAppearanceContext.Provider value={value}>
      {children}
    </DashboardAppearanceContext.Provider>
  );
}

export function useDashboardAppearance(): DashboardAppearanceContextValue {
  const ctx = useContext(DashboardAppearanceContext);
  if (!ctx) {
    throw new Error("useDashboardAppearance must be used within DashboardAppearanceProvider");
  }
  return ctx;
}

/** For PastelIcon / cards that may render outside strict layout boundaries; default to immersive. */
export function useOptionalDashboardAppearance(): DashboardAppearanceContextValue | null {
  return useContext(DashboardAppearanceContext);
}

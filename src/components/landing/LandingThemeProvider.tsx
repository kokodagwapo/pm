"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "smartstart-landing-theme";

export type LandingTheme = "light" | "dark";

type LandingThemeContextValue = {
  theme: LandingTheme;
  setTheme: (t: LandingTheme) => void;
  toggleTheme: () => void;
};

const LandingThemeContext = createContext<LandingThemeContextValue | null>(null);

export function LandingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<LandingTheme>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: LandingTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: LandingTheme = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <LandingThemeContext.Provider value={value}>{children}</LandingThemeContext.Provider>;
}

export function useLandingTheme(): LandingThemeContextValue {
  const ctx = useContext(LandingThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}

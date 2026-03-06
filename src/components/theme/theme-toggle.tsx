"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-7 w-14 items-center rounded-full 
        transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background
        ${isDark 
          ? "bg-slate-700 shadow-inner" 
          : "bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 shadow-md"
        }
      `}
      aria-label="Toggle dark mode"
    >
      {/* Track icons */}
      <Sun 
        className={`
          absolute left-1.5 h-3.5 w-3.5 transition-all duration-300
          ${!isDark ? "text-amber-600 opacity-100" : "text-slate-500 opacity-40"}
        `}
      />
      <Moon 
        className={`
          absolute right-1.5 h-3.5 w-3.5 transition-all duration-300
          ${isDark ? "text-blue-300 opacity-100" : "text-slate-400 opacity-40"}
        `}
      />
      
      {/* Thumb */}
      <span
        className={`
          inline-flex h-5 w-5 items-center justify-center
          transform rounded-full shadow-lg
          transition-all duration-300 ease-in-out
          ${isDark 
            ? "translate-x-8 bg-slate-900 ring-1 ring-slate-600" 
            : "translate-x-1 bg-white ring-1 ring-amber-300/50"
          }
        `}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-blue-400" />
        ) : (
          <Sun className="h-3 w-3 text-amber-500" />
        )}
      </span>
    </button>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";

const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "de-DE", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "es-ES", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "fr-FR", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "it-IT", label: "Italian", nativeLabel: "Italiano", flag: "🇮🇹" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳" },
  { code: "ja-JP", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵" },
  { code: "fil-PH", label: "Filipino", nativeLabel: "Filipino", flag: "🇵🇭" },
  { code: "ru-RU", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
];

interface LanguageSwitcherProps {
  variant?: "light" | "dark";
  className?: string;
  align?: "left" | "right";
  compact?: boolean;
}

export function LanguageSwitcher({
  variant = "light",
  className = "",
  align = "right",
  compact = false,
}: LanguageSwitcherProps) {
  const { currentLocale, setLocale } = useLocalizationContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLocale) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = variant === "dark";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          compact
            ? `flex items-center gap-1 p-1.5 rounded-lg transition-all touch-manipulation min-h-[36px] ${
                isDark
                  ? "text-white/70 hover:text-white hover:bg-white/15"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`
            : `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation min-h-[40px] ${
                isDark
                  ? "text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              }`
        }
      >
        <Globe className={`shrink-0 ${compact ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
        {!compact && <span className="hidden sm:inline">{current.flag}</span>}
        {!compact && <span className="hidden md:inline">{current.nativeLabel}</span>}
        <span className={compact ? "text-base leading-none" : "sm:hidden"}>{current.flag}</span>
        {!compact && (
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 w-48 rounded-xl shadow-xl border overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          } ${
            isDark
              ? "bg-slate-900/95 backdrop-blur-xl border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                role="option"
                aria-selected={lang.code === currentLocale}
                type="button"
                onClick={() => {
                  setLocale(lang.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors touch-manipulation ${
                  lang.code === currentLocale
                    ? isDark
                      ? "bg-white/10 text-white"
                      : "bg-slate-50 text-slate-900 font-medium"
                    : isDark
                    ? "text-white/70 hover:bg-white/5 hover:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.nativeLabel}</span>
                <span
                  className={`text-xs ${
                    isDark ? "text-white/40" : "text-slate-400"
                  }`}
                >
                  {lang.label}
                </span>
                {lang.code === currentLocale && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

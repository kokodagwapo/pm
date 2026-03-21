"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

/** Pastel glass icon wells for dark / video dashboard backgrounds */
export const dashboardPastelIconStyles = {
  primary: {
    icon: "text-sky-50",
    bg: "rounded-xl border border-sky-200/45 bg-gradient-to-br from-sky-300/35 via-sky-400/15 to-cyan-300/28 backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.16)]",
  },
  success: {
    icon: "text-emerald-50",
    bg: "rounded-xl border border-emerald-200/45 bg-gradient-to-br from-emerald-300/32 via-emerald-400/14 to-teal-300/26 backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.16)]",
  },
  warning: {
    icon: "text-amber-50",
    bg: "rounded-xl border border-amber-200/45 bg-gradient-to-br from-amber-300/30 via-amber-400/12 to-orange-300/24 backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.16)]",
  },
  error: {
    icon: "text-rose-50",
    bg: "rounded-xl border border-rose-200/45 bg-gradient-to-br from-rose-300/30 via-rose-400/14 to-pink-300/24 backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.16)]",
  },
  info: {
    icon: "text-violet-50",
    bg: "rounded-xl border border-violet-200/45 bg-gradient-to-br from-violet-300/30 via-violet-400/14 to-fuchsia-300/24 backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.16)]",
  },
} as const;

/** Crisp pastel wells on white dashboard — readable strokes, soft fills */
export const lightDashboardPastelIconStyles = {
  primary: {
    icon: "text-sky-600",
    bg: "rounded-xl border border-sky-200/95 bg-gradient-to-br from-sky-50 to-cyan-50/90 shadow-sm ring-1 ring-sky-100/80 [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.95)]",
  },
  success: {
    icon: "text-emerald-600",
    bg: "rounded-xl border border-emerald-200/95 bg-gradient-to-br from-emerald-50 to-teal-50/85 shadow-sm ring-1 ring-emerald-100/80 [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.95)]",
  },
  warning: {
    icon: "text-amber-700",
    bg: "rounded-xl border border-amber-200/95 bg-gradient-to-br from-amber-50 to-orange-50/80 shadow-sm ring-1 ring-amber-100/70 [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.95)]",
  },
  error: {
    icon: "text-rose-600",
    bg: "rounded-xl border border-rose-200/95 bg-gradient-to-br from-rose-50 to-pink-50/80 shadow-sm ring-1 ring-rose-100/75 [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.95)]",
  },
  info: {
    icon: "text-violet-600",
    bg: "rounded-xl border border-violet-200/95 bg-gradient-to-br from-violet-50 to-fuchsia-50/75 shadow-sm ring-1 ring-violet-100/75 [box-shadow:inset_0_1px_0_0_rgb(255_255_255_/_0.95)]",
  },
} as const;

export type PastelIconTint = keyof typeof dashboardPastelIconStyles;

const sizeConfig = {
  /** Sidebar child / tight rows */
  sm: { extra: "p-1 !rounded-lg", icon: "h-3.5 w-3.5" },
  /** Analytics cards, metric rows */
  md: { extra: "p-2", icon: "h-4 w-4" },
  /** Page section headers (e.g. Properties) */
  lg: { extra: "p-2", icon: "h-5 w-5" },
  /** Sidebar top-level — matches previous 1.125rem glyph size */
  nav: { extra: "p-1.5 !rounded-lg", icon: "h-[1.125rem] w-[1.125rem]" },
} as const;

export type PastelIconSize = keyof typeof sizeConfig;

/** Map legacy sidebar `iconColor` Tailwind classes to pastel tints */
export function pastelTintFromLegacyIconColor(iconColor?: string): PastelIconTint {
  if (!iconColor) return "primary";
  if (iconColor.includes("violet") || iconColor.includes("purple")) return "info";
  if (iconColor.includes("emerald") || iconColor.includes("teal")) return "success";
  if (iconColor.includes("amber") || iconColor.includes("orange")) return "warning";
  if (iconColor.includes("rose")) return "error";
  return "primary";
}

type IconComponent = LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>;

export function PastelIcon({
  icon: Icon,
  tint = "primary",
  size = "md",
  className,
  iconClassName,
  strokeWidth = 1.75,
}: {
  icon: IconComponent;
  tint?: PastelIconTint;
  size?: PastelIconSize;
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
}) {
  const appearance = useOptionalDashboardAppearance();
  const isLight = appearance?.isLight ?? false;
  const palette = isLight ? lightDashboardPastelIconStyles : dashboardPastelIconStyles;
  const styles = palette[tint];
  const sz = sizeConfig[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        styles.bg,
        sz.extra,
        className
      )}
    >
      <Icon
        className={cn(sz.icon, styles.icon, iconClassName)}
        strokeWidth={strokeWidth}
      />
    </div>
  );
}

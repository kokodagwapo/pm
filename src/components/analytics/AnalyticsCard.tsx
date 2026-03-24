"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { formatCurrency as formatCurrencyValue } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { PastelIcon } from "@/components/ui/pastel-icon";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

export { dashboardPastelIconStyles, lightDashboardPastelIconStyles } from "@/components/ui/pastel-icon";

export interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: "primary" | "success" | "warning" | "error" | "info";
  trend?: {
    value: string;
    isPositive: boolean;
    icon?: LucideIcon;
  };
  variant?: "default" | "financial" | "metric";
  className?: string;
  children?: React.ReactNode;
  /** When set, the whole card navigates (drilldown KPI). */
  href?: string;
}

export interface FinancialCardProps {
  label: string;
  amount: number;
  variant: "success" | "warning" | "error" | "info";
  className?: string;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: "primary" | "success" | "warning" | "error" | "info";
  className?: string;
}

const financialVariantClasses = {
  success: {
    background: "bg-gradient-to-br from-emerald-50 to-white",
    border: "border-emerald-100",
    text: "text-emerald-700",
  },
  warning: {
    background: "bg-gradient-to-br from-amber-50 to-white",
    border: "border-amber-100",
    text: "text-amber-700",
  },
  error: {
    background: "bg-gradient-to-br from-rose-50 to-white",
    border: "border-rose-100",
    text: "text-rose-700",
  },
  info: {
    background: "bg-gradient-to-br from-violet-50 to-white",
    border: "border-violet-100",
    text: "text-violet-700",
  },
};

export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "primary",
  trend,
  className,
  children,
  href,
}: AnalyticsCardProps) {
  const TrendIcon = trend?.icon;
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  const card = (
    <Card
      className={cn(
        "relative overflow-hidden rounded-xl p-0",
        href &&
          (isLight
            ? "transition-shadow hover:border-slate-200 hover:shadow-md"
            : "transition-colors hover:bg-white/[0.04]"),
        className
      )}
    >
      <CardContent className="p-5">
        <div className="mb-2.5 flex items-start justify-between">
          <p
            className={cn(
              "pr-2 text-sm font-medium leading-none tracking-wide",
              isLight ? "text-slate-500" : "text-white/90"
            )}
          >
            {title}
          </p>
          {Icon && (
            <PastelIcon icon={Icon} tint={iconColor} size="md" />
          )}
        </div>

        <div
          className={cn(
            "mb-1.5 text-3xl font-semibold leading-none tracking-tight",
            isLight ? "text-slate-900" : "text-white"
          )}
        >
          {value}
        </div>

        {description && (
          <p
            className={cn(
              "text-sm font-normal leading-snug",
              isLight ? "text-slate-600" : "text-white/85"
            )}
          >
            {description}
          </p>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {TrendIcon && (
              <TrendIcon
                className={cn(
                  "h-3 w-3",
                  trend.isPositive
                    ? isLight
                      ? "text-emerald-600"
                      : "text-emerald-200"
                    : isLight
                      ? "text-rose-600"
                      : "text-rose-200"
                )}
              />
            )}
            <span
              className={cn(
                "text-sm font-medium tracking-wide",
                trend.isPositive
                  ? isLight
                    ? "text-emerald-600"
                    : "text-emerald-200"
                  : isLight
                    ? "text-rose-600"
                    : "text-rose-200"
              )}
            >
              {trend.value}
            </span>
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
          isLight ? "focus-visible:ring-offset-2 focus-visible:ring-offset-white" : "focus-visible:ring-offset-0"
        )}
      >
        {card}
      </Link>
    );
  }

  return card;
}

export function FinancialCard({
  label,
  amount,
  variant,
  className,
}: FinancialCardProps) {
  const variantClasses = financialVariantClasses[variant];

  return (
    <div
      className={cn(
        "dashboard-ui-surface flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 rounded-2xl p-4",
        className
      )}
    >
      <span className={cn("font-medium text-sm tracking-wide", variantClasses.text)}>
        {label}
      </span>
      <span className={cn("text-xl font-semibold tracking-tight", variantClasses.text)}>
        {formatCurrencyValue(amount)}
      </span>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "primary",
  className,
}: MetricCardProps) {
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  return (
    <Card className={cn("rounded-xl", className)}>
      <CardContent className="p-5">
        <div className="mb-2.5 flex items-center gap-3">
          {Icon && (
            <PastelIcon icon={Icon} tint={iconColor} size="md" />
          )}
          <p
            className={cn(
              "text-sm font-medium tracking-wide",
              isLight ? "text-slate-500" : "text-white/90"
            )}
          >
            {title}
          </p>
        </div>
        <div
          className={cn(
            "text-3xl font-semibold tracking-tight",
            isLight ? "text-slate-900" : "text-white"
          )}
        >
          {value}
        </div>
        {subtitle && (
          <p className={cn("mt-1 text-sm", isLight ? "text-slate-600" : "text-white")}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FinancialCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 max-w-full grid-cols-1 gap-3 lg:gap-4", className)}>
      {children}
    </div>
  );
}

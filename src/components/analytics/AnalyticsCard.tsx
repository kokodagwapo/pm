import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { formatCurrency as formatCurrencyValue } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";

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

const iconColorClasses = {
  primary:  { icon: "text-sky-600",     bg: "bg-sky-50     border-sky-100"     },
  success:  { icon: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  warning:  { icon: "text-amber-600",   bg: "bg-amber-50   border-amber-100"   },
  error:    { icon: "text-rose-600",    bg: "bg-rose-50    border-rose-100"    },
  info:     { icon: "text-violet-600",  bg: "bg-violet-50  border-violet-100"  },
};

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
}: AnalyticsCardProps) {
  const TrendIcon = trend?.icon;
  const colors = iconColorClasses[iconColor];

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-white/10 dark:bg-black/20 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl p-0",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 leading-none pr-2">
            {title}
          </p>
          {Icon && (
            <div className={cn("p-2 rounded-xl border shrink-0", colors.bg)}>
              <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
            </div>
          )}
        </div>

        <div className="text-[1.85rem] font-extrabold tracking-tight text-foreground leading-none mb-2">
          {value}
        </div>

        {description && (
          <p className="text-[11px] text-muted-foreground/70 leading-snug">{description}</p>
        )}

        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {TrendIcon && (
              <TrendIcon
                className={cn(
                  "h-3 w-3",
                  trend.isPositive ? "text-emerald-500" : "text-rose-500"
                )}
              />
            )}
            <span
              className={cn(
                "text-xs font-semibold",
                trend.isPositive ? "text-emerald-600" : "text-rose-600"
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
        "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 rounded-2xl border backdrop-blur-lg",
        "bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10",
        className
      )}
    >
      <span className={cn("font-semibold text-sm", variantClasses.text)}>
        {label}
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", variantClasses.text)}>
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
  const colors = iconColorClasses[iconColor];

  return (
    <Card className={cn("rounded-2xl bg-white/10 dark:bg-black/20 shadow-lg", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          {Icon && (
            <div className={cn("p-2 rounded-xl border", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.icon)} />
            </div>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </p>
        </div>
        <div className="text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/70 mt-1">{subtitle}</p>
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
        "grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
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
    <div className={cn("grid grid-cols-1 gap-3 lg:gap-4", className)}>
      {children}
    </div>
  );
}

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
        "relative overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200 rounded-xl p-0",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2.5">
          <p className="text-[11px] font-medium text-muted-foreground leading-none pr-2">
            {title}
          </p>
          {Icon && (
            <div className={cn("p-1.5 rounded-lg border shrink-0", colors.bg)}>
              <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
            </div>
          )}
        </div>

        <div className="text-2xl font-semibold tracking-tight text-foreground leading-none mb-1.5">
          {value}
        </div>

        {description && (
          <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
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
        "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 rounded-xl border",
        "bg-card border-border",
        className
      )}
    >
      <span className={cn("font-medium text-sm", variantClasses.text)}>
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
  const colors = iconColorClasses[iconColor];

  return (
    <Card className={cn("rounded-xl bg-card border border-border shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2.5">
          {Icon && (
            <div className={cn("p-1.5 rounded-lg border", colors.bg)}>
              <Icon className={cn("h-4 w-4", colors.icon)} />
            </div>
          )}
          <p className="text-[11px] font-medium text-muted-foreground">
            {title}
          </p>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
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

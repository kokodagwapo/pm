"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { DateBlockType } from "@/types";

export interface CalendarBlock {
  _id: string;
  startDate: string;
  endDate: string;
  blockType: DateBlockType;
  reason?: string;
  isHardBlock?: boolean;
  blockedBy?: { firstName: string; lastName: string };
}

export interface CalendarPricingRule {
  _id: string;
  name: string;
  ruleType: string;
  startDate?: string;
  endDate?: string;
  pricePerNight?: number;
  priceModifier?: { type: "fixed" | "percentage"; value: number };
  minimumStay?: number;
  daysOfWeek?: number[];
  isActive: boolean;
}

export interface CalendarLease {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  tenantName?: string;
}

export interface CalendarRentalRequest {
  _id: string;
  requestedStartDate: string;
  requestedEndDate: string;
  status: string;
}

export interface DateSelection {
  startDate: Date;
  endDate: Date;
}

export type DayStatus = "available" | "blocked" | "booked" | "pending" | "past";

interface DayInfo {
  date: Date;
  status: DayStatus;
  block?: CalendarBlock;
  lease?: CalendarLease;
  request?: CalendarRentalRequest;
  pricePerNight?: number;
  pricingRule?: CalendarPricingRule;
  minimumStay?: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface AvailabilityCalendarProps {
  blocks: CalendarBlock[];
  pricingRules?: CalendarPricingRule[];
  leases?: CalendarLease[];
  rentalRequests?: CalendarRentalRequest[];
  baseRentPerNight?: number;
  onDateSelect?: (selection: DateSelection) => void;
  onBlockCreate?: (selection: DateSelection) => void;
  onPricingCreate?: (selection: DateSelection) => void;
  readOnly?: boolean;
  showPricing?: boolean;
  showLegend?: boolean;
  className?: string;
  /** 1 = one month (classic month view); 2 = two months side by side (default). */
  monthsShown?: 1 | 2;
  /** Taller day cells for single-month dashboard layouts. */
  daySize?: "default" | "comfortable";
  /** Drag a range (default) or tap check-in then checkout day (exclusive end). */
  selectionMode?: "drag" | "two-click";
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  owner_stay: "Owner Stay",
  maintenance: "Maintenance",
  hold: "Hold",
  renovation: "Renovation",
  personal: "Personal",
  seasonal_closure: "Seasonal Closure",
};

/** High-contrast cells on light dashboard + landing (blue type for readability) */
const STATUS_COLORS_LIGHT: Record<DayStatus, string> = {
  available:
    "border border-emerald-200/80 bg-emerald-50 text-blue-950 hover:bg-emerald-100/90",
  blocked: "bg-red-100 text-red-900",
  booked: "bg-sky-100 text-blue-950",
  pending: "bg-amber-100 text-amber-950",
  past: "bg-slate-100 text-blue-800/70",
};

/** Immersive / video dashboard: translucent cells (do not rely on `dark:` — html may stay light). */
const STATUS_COLORS_GLASS: Record<DayStatus, string> = {
  available:
    "border border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-50 backdrop-blur-sm hover:border-emerald-300/35 hover:bg-emerald-500/[0.22]",
  blocked:
    "border border-red-400/30 bg-red-500/[0.16] text-red-100 backdrop-blur-sm",
  booked:
    "border border-sky-400/25 bg-sky-500/[0.14] text-sky-50 backdrop-blur-sm",
  pending:
    "border border-amber-400/28 bg-amber-500/[0.15] text-amber-50 backdrop-blur-sm",
  past: "border border-white/[0.07] bg-white/[0.04] text-white/40 backdrop-blur-sm",
};

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isDateInRange(date: Date, start: string, end: string): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return d >= s && d < e;
}

function isDateBetween(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(Math.min(start.getTime(), end.getTime()));
  s.setHours(0, 0, 0, 0);
  const e = new Date(Math.max(start.getTime(), end.getTime()));
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
}

export function AvailabilityCalendar({
  blocks,
  pricingRules = [],
  leases = [],
  rentalRequests = [],
  baseRentPerNight = 0,
  onDateSelect,
  onBlockCreate,
  onPricingCreate,
  readOnly = false,
  showPricing = true,
  showLegend = true,
  className,
  monthsShown = 2,
  daySize = "default",
  selectionMode = "drag",
}: AvailabilityCalendarProps) {
  const dash = useOptionalDashboardAppearance();
  /** Default light when no provider (e.g. property landing) — avoids glass + pale text on cream backgrounds */
  const isLight = dash?.isLight ?? true;
  const statusColors = isLight ? STATUS_COLORS_LIGHT : STATUS_COLORS_GLASS;

  const glassOutlineBtn =
    "rounded-xl border border-white/18 bg-white/[0.08] shadow-none backdrop-blur-sm transition-[background-color,border-color] hover:bg-white/[0.12]";
  const glassOutlineBtnLight =
    "rounded-xl border border-blue-200/80 bg-white/90 text-blue-950 shadow-sm backdrop-blur-sm hover:bg-white hover:border-blue-300/90";

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [twoClickAnchor, setTwoClickAnchor] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d;
  }, []);

  const month1Year = currentDate.getFullYear();
  const month1Month = currentDate.getMonth();
  const month2Date = new Date(month1Year, month1Month + 1, 1);
  const month2Year = month2Date.getFullYear();
  const month2Month = month2Date.getMonth();

  const navigateMonth = useCallback((direction: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      if (direction < 0 && next < new Date(today.getFullYear(), today.getMonth(), 1)) {
        return new Date(today.getFullYear(), today.getMonth(), 1);
      }
      if (direction > 0 && next > maxDate) {
        return prev;
      }
      return next;
    });
  }, [today, maxDate]);

  const getDayInfo = useCallback(
    (date: Date, isCurrentMonth: boolean): DayInfo => {
      const isPast = date < today;
      const isToday = isSameDay(date, today);

      if (isPast && !isToday) {
        return { date, status: "past", isToday: false, isCurrentMonth };
      }

      const block = blocks.find(
        (b) => isDateInRange(date, b.startDate, b.endDate)
      );
      if (block) {
        return { date, status: "blocked", block, isToday, isCurrentMonth };
      }

      const lease = leases.find(
        (l) =>
          (l.status === "active" || l.status === "pending") &&
          isDateInRange(date, l.startDate, l.endDate)
      );
      if (lease) {
        return { date, status: "booked", lease, isToday, isCurrentMonth };
      }

      const request = rentalRequests.find(
        (r) =>
          r.status === "pending" &&
          isDateInRange(date, r.requestedStartDate, r.requestedEndDate)
      );
      if (request) {
        return { date, status: "pending", request, isToday, isCurrentMonth };
      }

      let pricePerNight = baseRentPerNight;
      let activePricingRule: CalendarPricingRule | undefined;
      let minimumStay: number | undefined;
      const dayOfWeek = date.getDay();

      const sortedRules = [...pricingRules]
        .filter((r) => r.isActive)
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = {
            daily_override: 5,
            holiday: 4,
            seasonal: 3,
            weekend: 2,
            weekday: 1,
          };
          return (priorityOrder[b.ruleType] || 0) - (priorityOrder[a.ruleType] || 0);
        });

      for (const rule of sortedRules) {
        let matches = false;

        if (
          (rule.ruleType === "daily_override" ||
            rule.ruleType === "holiday" ||
            rule.ruleType === "seasonal") &&
          rule.startDate &&
          rule.endDate
        ) {
          matches = isDateInRange(date, rule.startDate, rule.endDate);
        } else if (rule.ruleType === "weekend") {
          matches = rule.daysOfWeek
            ? rule.daysOfWeek.includes(dayOfWeek)
            : dayOfWeek === 0 || dayOfWeek === 6;
        } else if (rule.ruleType === "weekday") {
          matches = rule.daysOfWeek
            ? rule.daysOfWeek.includes(dayOfWeek)
            : dayOfWeek >= 1 && dayOfWeek <= 5;
        }

        if (matches) {
          if (rule.pricePerNight !== undefined && rule.pricePerNight !== null) {
            pricePerNight = rule.pricePerNight;
          } else if (rule.priceModifier) {
            if (rule.priceModifier.type === "fixed") {
              pricePerNight = baseRentPerNight + rule.priceModifier.value;
            } else if (rule.priceModifier.type === "percentage") {
              pricePerNight = baseRentPerNight * (1 + rule.priceModifier.value / 100);
            }
          }
          activePricingRule = rule;
          if (rule.minimumStay) minimumStay = rule.minimumStay;
          break;
        }
      }

      return {
        date,
        status: "available",
        pricePerNight: Math.round(pricePerNight * 100) / 100,
        pricingRule: activePricingRule,
        minimumStay,
        isToday,
        isCurrentMonth,
      };
    },
    [blocks, leases, rentalRequests, pricingRules, baseRentPerNight, today]
  );

  const handleMouseDown = useCallback(
    (date: Date, dayInfo: DayInfo) => {
      if (selectionMode === "two-click") return;
      if (readOnly || dayInfo.status === "past") return;
      setSelectionStart(date);
      setSelectionEnd(date);
      setIsDragging(true);
    },
    [readOnly, selectionMode]
  );

  const handleTwoClickDay = useCallback(
    (date: Date, dayInfo: DayInfo) => {
      if (selectionMode !== "two-click") return;
      if (readOnly || dayInfo.status === "past") return;

      if (!twoClickAnchor) {
        setTwoClickAnchor(date);
        setSelectionStart(date);
        setSelectionEnd(date);
        return;
      }

      const t1 = twoClickAnchor.getTime();
      const t2 = date.getTime();
      const checkIn = new Date(Math.min(t1, t2));
      const checkoutExclusive = isSameDay(twoClickAnchor, date)
        ? (() => {
            const e = new Date(checkIn);
            e.setDate(e.getDate() + 1);
            return e;
          })()
        : new Date(Math.max(t1, t2));

      const lastNight = new Date(checkoutExclusive);
      lastNight.setDate(lastNight.getDate() - 1);

      setTwoClickAnchor(null);
      setSelectionStart(checkIn);
      setSelectionEnd(lastNight);

      if (onDateSelect) {
        onDateSelect({ startDate: checkIn, endDate: checkoutExclusive });
      }
    },
    [selectionMode, readOnly, twoClickAnchor, onDateSelect]
  );

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (!isDragging || !selectionStart) return;
      setSelectionEnd(date);
    },
    [isDragging, selectionStart]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !selectionStart || !selectionEnd) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const start = new Date(Math.min(selectionStart.getTime(), selectionEnd.getTime()));
    const end = new Date(Math.max(selectionStart.getTime(), selectionEnd.getTime()));
    end.setDate(end.getDate() + 1);

    if (onDateSelect) {
      onDateSelect({ startDate: start, endDate: end });
    }
  }, [isDragging, selectionStart, selectionEnd, onDateSelect]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) handleMouseUp();
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);

  const isInSelection = useCallback(
    (date: Date) => {
      if (!selectionStart || !selectionEnd) return false;
      return isDateBetween(date, selectionStart, selectionEnd);
    },
    [selectionStart, selectionEnd]
  );

  const dayCellMin = daySize === "comfortable" ? "h-16 min-h-[4rem]" : "h-14";
  const dayTextSize = daySize === "comfortable" ? "text-sm" : "text-xs";

  const renderMonth = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const days: (DayInfo | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(getDayInfo(date, true));
    }

    return (
      <div
        className={cn(
          "flex-1",
          monthsShown === 1 ? "min-w-0 max-w-xl mx-auto w-full" : "min-w-[280px]"
        )}
      >
        {monthsShown === 2 && (
          <h3
            className={cn(
              "mb-3 text-center text-base font-semibold",
              isLight ? "text-blue-950" : "text-white"
            )}
          >
            {monthName}
          </h3>
        )}
        <div
          className={cn(
            "mb-2 grid grid-cols-7 rounded-xl border p-1.5 backdrop-blur-sm",
            monthsShown === 1 ? "gap-1.5" : "gap-0.5",
            isLight
              ? "border-slate-200/70 bg-white/50"
              : "border-white/[0.1] bg-white/[0.05]"
          )}
        >
          {WEEKDAY_HEADERS.map((header) => (
            <div
              key={header}
              className={cn(
                "py-1 text-center text-[11px] font-semibold uppercase tracking-wider",
                isLight ? "text-blue-800" : "text-white/55"
              )}
            >
              {header}
            </div>
          ))}
        </div>
        <div
          className={cn(
            "grid grid-cols-7 rounded-2xl border p-2 backdrop-blur-md sm:p-2.5",
            monthsShown === 1 ? "gap-1.5" : "gap-0.5",
            isLight
              ? "border-slate-200/70 bg-white/35 shadow-inner"
              : "border-white/[0.1] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          )}
        >
          {days.map((dayInfo, index) => {
            if (!dayInfo) {
              return (
                <div
                  key={`empty-${index}`}
                  className={cn(
                    dayCellMin,
                    "rounded-xl",
                    isLight ? "bg-slate-100/30" : "bg-white/[0.02]"
                  )}
                />
              );
            }
            return renderDay(dayInfo);
          })}
        </div>
      </div>
    );
  };

  const renderDay = (dayInfo: DayInfo) => {
    const { date, status, isToday, isCurrentMonth } = dayInfo;
    const dayNumber = date.getDate();
    const selected = isInSelection(date);

    const tooltipContent = getTooltipContent(dayInfo);

    return (
      <TooltipProvider key={date.toISOString()} delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex w-full select-none flex-col items-center justify-start gap-0.5 rounded-xl pt-1 transition-all duration-150",
                dayCellMin,
                dayTextSize,
                !isCurrentMonth && "opacity-45",
                statusColors[status],
                selected &&
                  (isLight
                    ? "z-[1] ring-2 ring-blue-600 ring-offset-2 ring-offset-white"
                    : "z-[1] ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-transparent"),
                isToday &&
                  !selected &&
                  (isLight ? "ring-1 ring-blue-400/70" : "ring-1 ring-white/35"),
                status === "available" && !readOnly && "cursor-pointer",
                (status === "past" || readOnly) && "cursor-default",
                status !== "past" && status !== "available" && "cursor-default"
              )}
              onMouseDown={() => handleMouseDown(date, dayInfo)}
              onMouseEnter={() => handleMouseEnter(date)}
              onClick={() => handleTwoClickDay(date, dayInfo)}
              disabled={status === "past"}
              aria-label={`${date.toLocaleDateString()} - ${status}`}
            >
              <span className={cn("font-medium", isToday && "underline underline-offset-2")}>
                {dayNumber}
              </span>
              {showPricing && status === "available" && dayInfo.pricePerNight !== undefined && (
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 font-medium leading-none tabular-nums",
                    daySize === "comfortable" ? "text-[11px]" : "text-[10px]",
                    isLight ? "text-blue-800" : "text-cyan-100/85"
                  )}
                >
                  ${dayInfo.pricePerNight.toFixed(0)}
                </span>
              )}
              {status === "blocked" && dayInfo.block?.isHardBlock && (
                <Lock className="h-2.5 w-2.5 text-red-500" />
              )}
            </button>
          </TooltipTrigger>
          {tooltipContent && (
            <TooltipContent side="top" className="max-w-[220px]">
              {tooltipContent}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getTooltipContent = (dayInfo: DayInfo): React.ReactNode => {
    const dateStr = dayInfo.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    switch (dayInfo.status) {
      case "blocked":
        return (
          <div className="space-y-1">
            <p className={cn("font-semibold", isLight ? "text-slate-900" : "")}>
              {dateStr}
            </p>
            <p className={isLight ? "text-red-700" : "text-red-400"}>
              Blocked: {BLOCK_TYPE_LABELS[dayInfo.block?.blockType || ""] || dayInfo.block?.blockType}
            </p>
            {dayInfo.block?.reason && (
              <p
                className={cn(
                  "text-xs",
                  isLight ? "text-slate-600" : "text-muted-foreground"
                )}
              >
                {dayInfo.block.reason}
              </p>
            )}
            {dayInfo.block?.isHardBlock && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isLight ? "text-red-700" : "text-red-400"
                )}
              >
                <Lock className="h-3 w-3" /> Hard block
              </p>
            )}
          </div>
        );
      case "booked":
        return (
          <div className="space-y-1">
            <p className={cn("font-semibold", isLight ? "text-slate-900" : "")}>
              {dateStr}
            </p>
            <p className={isLight ? "text-sky-800" : "text-blue-400"}>Occupied</p>
            {dayInfo.lease?.tenantName && (
              <p
                className={cn(
                  "text-xs",
                  isLight ? "text-slate-600" : "text-muted-foreground"
                )}
              >
                Tenant: {dayInfo.lease.tenantName}
              </p>
            )}
          </div>
        );
      case "pending":
        return (
          <div className="space-y-1">
            <p className={cn("font-semibold", isLight ? "text-slate-900" : "")}>
              {dateStr}
            </p>
            <p className={isLight ? "text-amber-800" : "text-yellow-400"}>
              Pending Request
            </p>
          </div>
        );
      case "available":
        return (
          <div className="space-y-1">
            <p className={cn("font-semibold", isLight ? "text-slate-900" : "")}>
              {dateStr}
            </p>
            <p className={isLight ? "text-emerald-800" : "text-emerald-400"}>
              Available
            </p>
            {showPricing && dayInfo.pricePerNight !== undefined && (
              <p className={cn("text-xs", isLight ? "text-slate-700" : "")}>
                ${dayInfo.pricePerNight.toFixed(2)}/night
              </p>
            )}
            {dayInfo.pricingRule && (
              <p
                className={cn(
                  "text-xs",
                  isLight ? "text-slate-600" : "text-muted-foreground"
                )}
              >
                Rule: {dayInfo.pricingRule.name}
              </p>
            )}
            {dayInfo.minimumStay && (
              <p
                className={cn(
                  "text-xs",
                  isLight ? "text-slate-600" : "text-muted-foreground"
                )}
              >
                Min stay: {dayInfo.minimumStay} nights
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const canGoBack = useMemo(() => {
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    return currentDate > minDate;
  }, [currentDate, today]);

  const canGoForward = useMemo(() => {
    if (monthsShown === 1) {
      const nextFirst = new Date(month1Year, month1Month + 1, 1);
      return nextFirst <= maxDate;
    }
    const nextMonth = new Date(month2Year, month2Month + 1, 1);
    return nextMonth <= maxDate;
  }, [monthsShown, month1Year, month1Month, month2Year, month2Month, maxDate]);

  const centerMonthLabel = new Date(month1Year, month1Month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn("space-y-4", className)} ref={calendarRef}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="icon"
            className={cn("shrink-0", isLight ? glassOutlineBtnLight : glassOutlineBtn)}
            onClick={() => navigateMonth(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {monthsShown === 1 ? (
            <h2
              className={cn(
                "min-w-0 flex-1 truncate text-center text-lg font-semibold tracking-tight sm:text-xl",
                isLight ? "text-blue-950" : "text-white"
              )}
            >
              {centerMonthLabel}
            </h2>
          ) : (
            <div className="flex-1" aria-hidden />
          )}

          <Button
            variant="outline"
            size="icon"
            className={cn("shrink-0", isLight ? glassOutlineBtnLight : glassOutlineBtn)}
            onClick={() => navigateMonth(1)}
            disabled={!canGoForward}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {selectionStart && selectionEnd && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-md",
              isLight
                ? "border-slate-200/90 bg-white/80 shadow-inner"
                : "border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            )}
          >
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium backdrop-blur-sm",
                isLight
                  ? "border-blue-200/80 bg-white/90 text-blue-950"
                  : "border-white/20 bg-white/[0.06] text-white"
              )}
            >
              {new Date(
                Math.min(selectionStart.getTime(), selectionEnd.getTime())
              ).toLocaleDateString()}{" "}
              –{" "}
              {new Date(
                Math.max(selectionStart.getTime(), selectionEnd.getTime())
              ).toLocaleDateString()}
            </Badge>
            {!readOnly && onBlockCreate && (
              <Button
                size="sm"
                variant="outline"
                className={isLight ? glassOutlineBtnLight : glassOutlineBtn}
                onClick={() => {
                  const start = new Date(
                    Math.min(selectionStart.getTime(), selectionEnd.getTime())
                  );
                  const end = new Date(
                    Math.max(selectionStart.getTime(), selectionEnd.getTime())
                  );
                  end.setDate(end.getDate() + 1);
                  onBlockCreate({ startDate: start, endDate: end });
                  setSelectionStart(null);
                  setSelectionEnd(null);
                }}
              >
                Block Dates
              </Button>
            )}
            {!readOnly && onPricingCreate && (
              <Button
                size="sm"
                variant="outline"
                className={isLight ? glassOutlineBtnLight : glassOutlineBtn}
                onClick={() => {
                  const start = new Date(
                    Math.min(selectionStart.getTime(), selectionEnd.getTime())
                  );
                  const end = new Date(
                    Math.max(selectionStart.getTime(), selectionEnd.getTime())
                  );
                  end.setDate(end.getDate() + 1);
                  onPricingCreate({ startDate: start, endDate: end });
                  setSelectionStart(null);
                  setSelectionEnd(null);
                }}
              >
                Set Pricing
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectionStart(null);
                setSelectionEnd(null);
                setTwoClickAnchor(null);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-6",
          monthsShown === 1 ? "" : "md:flex-row"
        )}
      >
        {renderMonth(month1Year, month1Month)}
        {monthsShown === 2 && renderMonth(month2Year, month2Month)}
      </div>

      {showLegend && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-xs backdrop-blur-sm sm:gap-4",
            isLight
              ? "border-blue-200/60 bg-blue-50/40 text-blue-900"
              : "border-white/[0.1] bg-white/[0.05] text-white/65"
          )}
        >
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-3 w-3 rounded-sm border backdrop-blur-sm",
                isLight
                  ? "border-emerald-300/50 bg-emerald-200"
                  : "border-emerald-400/30 bg-emerald-500/25"
              )}
            />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-3 w-3 rounded-sm border backdrop-blur-sm",
                isLight
                  ? "border-red-300/50 bg-red-200"
                  : "border-red-400/35 bg-red-500/25"
              )}
            />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-3 w-3 rounded-sm border backdrop-blur-sm",
                isLight
                  ? "border-sky-300/50 bg-sky-200"
                  : "border-sky-400/30 bg-sky-500/20"
              )}
            />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "h-3 w-3 rounded-sm border backdrop-blur-sm",
                isLight
                  ? "border-amber-300/50 bg-amber-200"
                  : "border-amber-400/30 bg-amber-500/22"
              )}
            />
            <span>Pending Request</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            <span>Hard Block</span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              <span>
                {selectionMode === "two-click"
                  ? "Tap check-in, then checkout day."
                  : "Click & drag to select dates"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

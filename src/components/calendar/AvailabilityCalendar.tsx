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
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  owner_stay: "Owner Stay",
  maintenance: "Maintenance",
  hold: "Hold",
  renovation: "Renovation",
  personal: "Personal",
  seasonal_closure: "Seasonal Closure",
};

const STATUS_COLORS: Record<DayStatus, string> = {
  available: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
  blocked: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
  booked: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  past: "bg-gray-100 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600",
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
}: AvailabilityCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      if (readOnly || dayInfo.status === "past") return;
      setSelectionStart(date);
      setSelectionEnd(date);
      setIsDragging(true);
    },
    [readOnly]
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
      <div className="flex-1 min-w-[280px]">
        <h3 className="text-center font-semibold text-base mb-3">{monthName}</h3>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAY_HEADERS.map((header) => (
            <div
              key={header}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {header}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((dayInfo, index) => {
            if (!dayInfo) {
              return <div key={`empty-${index}`} className="h-14" />;
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
                "relative h-14 w-full rounded-md text-xs transition-all duration-150 flex flex-col items-center justify-start pt-1 gap-0.5 select-none",
                !isCurrentMonth && "opacity-40",
                STATUS_COLORS[status],
                selected && "ring-2 ring-primary ring-offset-1",
                isToday && "ring-1 ring-primary/50",
                status === "available" && !readOnly && "cursor-pointer",
                (status === "past" || readOnly) && "cursor-default",
                status !== "past" && status !== "available" && "cursor-default"
              )}
              onMouseDown={() => handleMouseDown(date, dayInfo)}
              onMouseEnter={() => handleMouseEnter(date)}
              disabled={status === "past"}
              aria-label={`${date.toLocaleDateString()} - ${status}`}
            >
              <span className={cn("font-medium", isToday && "underline underline-offset-2")}>
                {dayNumber}
              </span>
              {showPricing && status === "available" && dayInfo.pricePerNight !== undefined && (
                <span className="text-[10px] leading-none text-muted-foreground truncate max-w-full px-0.5">
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
            <p className="font-semibold">{dateStr}</p>
            <p className="text-red-400">
              Blocked: {BLOCK_TYPE_LABELS[dayInfo.block?.blockType || ""] || dayInfo.block?.blockType}
            </p>
            {dayInfo.block?.reason && (
              <p className="text-xs text-muted-foreground">{dayInfo.block.reason}</p>
            )}
            {dayInfo.block?.isHardBlock && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Hard block
              </p>
            )}
          </div>
        );
      case "booked":
        return (
          <div className="space-y-1">
            <p className="font-semibold">{dateStr}</p>
            <p className="text-blue-400">Occupied</p>
            {dayInfo.lease?.tenantName && (
              <p className="text-xs text-muted-foreground">
                Tenant: {dayInfo.lease.tenantName}
              </p>
            )}
          </div>
        );
      case "pending":
        return (
          <div className="space-y-1">
            <p className="font-semibold">{dateStr}</p>
            <p className="text-yellow-400">Pending Request</p>
          </div>
        );
      case "available":
        return (
          <div className="space-y-1">
            <p className="font-semibold">{dateStr}</p>
            <p className="text-emerald-400">Available</p>
            {showPricing && dayInfo.pricePerNight !== undefined && (
              <p className="text-xs">
                ${dayInfo.pricePerNight.toFixed(2)}/night
              </p>
            )}
            {dayInfo.pricingRule && (
              <p className="text-xs text-muted-foreground">
                Rule: {dayInfo.pricingRule.name}
              </p>
            )}
            {dayInfo.minimumStay && (
              <p className="text-xs text-muted-foreground">
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
    const nextMonth = new Date(month2Year, month2Month + 1, 1);
    return nextMonth <= maxDate;
  }, [month2Year, month2Month, maxDate]);

  return (
    <div className={cn("space-y-4", className)} ref={calendarRef}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          {selectionStart && selectionEnd && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
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
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigateMonth(1)}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {renderMonth(month1Year, month1Month)}
        {renderMonth(month2Year, month2Month)}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/50" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/50" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900/50" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-yellow-200 dark:bg-yellow-900/50" />
            <span>Pending Request</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            <span>Hard Block</span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              <span>Click & drag to select dates</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

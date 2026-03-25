"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Grid3X3,
  List,
  MapPin,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { cn } from "@/lib/utils";

interface PropertyItem {
  _id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  status?: string;
  type?: string;
  units?: { _id: string; unitNumber: string; status: string }[];
}

const VIEW_STORAGE_KEY = "smartstartpm-property-calendar-index-view";

type IndexViewMode = "grid" | "list" | "calendar";

function loadSavedView(): IndexViewMode {
  if (typeof window === "undefined") return "grid";
  const v = sessionStorage.getItem(VIEW_STORAGE_KEY);
  if (v === "list" || v === "calendar" || v === "grid") return v;
  return "grid";
}

export default function PropertyCalendarIndexPage() {
  const router = useRouter();
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<IndexViewMode>("grid");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [pickerDate, setPickerDate] = useState<Date | undefined>(() => new Date());

  useEffect(() => {
    setViewMode(loadSavedView());
  }, []);

  const persistView = useCallback((mode: IndexViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/properties?limit=200");
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data = await res.json();
      const props = data.data?.properties || data.data || [];
      setProperties(props);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load properties";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? properties.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.city?.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.street?.toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "occupied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const openPropertyCalendar = (id: string) => {
    router.push(`/dashboard/properties/${id}/calendar`);
  };

  const viewToggleClass = (active: boolean) =>
    cn(
      "h-9 px-3",
      active
        ? isLight
          ? "bg-slate-900 text-white shadow-sm hover:bg-slate-900 hover:text-white dark:bg-white dark:text-slate-900"
          : "bg-white/15 text-white hover:bg-white/20 hover:text-white"
        : isLight
          ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          : "text-white/75 hover:bg-white/10 hover:text-white"
    );

  const skeletonGrid = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );

  const skeletonList = (
    <div className="overflow-hidden rounded-xl border border-border">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse border-b border-border px-4 py-3 last:border-b-0">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );

  const skeletonCalendarLayout = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="h-[380px] animate-pulse rounded-xl border border-border bg-muted/40" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  );

  const emptyState = (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Building2
          className={cn(
            "mb-3 h-12 w-12",
            isLight ? "text-slate-400" : "text-muted-foreground"
          )}
        />
        <h3
          className={cn(
            "mb-1 text-lg font-semibold",
            isLight ? "text-slate-900" : "text-foreground"
          )}
        >
          {search ? "No properties match your search" : "No properties found"}
        </h3>
        <p
          className={cn("text-sm", isLight ? "text-slate-600" : "text-muted-foreground")}
        >
          {search
            ? "Try a different search term"
            : "Add properties first to manage their calendars"}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1
          className={cn(
            "flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl",
            isLight ? "text-slate-900" : "text-white"
          )}
        >
          <CalendarDays
            className={cn(
              "h-6 w-6 shrink-0",
              isLight ? "text-slate-800" : "text-white"
            )}
          />
          Availability Calendar
        </h1>
        <p
          className={cn(
            "mt-1 text-sm sm:text-base",
            isLight ? "text-slate-600" : "text-white/80"
          )}
        >
          Select a property to manage its availability, date blocks, and pricing
          rules.
        </p>
        <p
          className={cn(
            "mt-2 text-sm",
            isLight ? "text-slate-600" : "text-white/75"
          )}
        >
          <Link
            href="/dashboard/properties/stay-finder"
            className={cn(
              "font-medium underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-90",
              isLight ? "text-sky-700" : "text-sky-300"
            )}
          >
            {t("nav.properties.stayFinder")}
          </Link>
          <span className={isLight ? "text-slate-500" : "text-white/50"}>
            {" "}
            — {t("nav.properties.stayFinderCalendarTeaser")}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 max-w-md flex-1">
          <Search
            className={cn(
              "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              isLight ? "text-slate-500" : "text-muted-foreground"
            )}
          />
          <Input
            placeholder={t("properties.filters.search.placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div
          className={cn(
            "inline-flex shrink-0 rounded-lg border p-1",
            isLight ? "border-slate-200 bg-white" : "border-white/15 bg-white/5"
          )}
          role="group"
          aria-label={t("properties.calendarIndex.view.toolbarAria")}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={viewToggleClass(viewMode === "grid")}
            aria-pressed={viewMode === "grid"}
            onClick={() => persistView("grid")}
          >
            <Grid3X3 className="mr-1.5 h-4 w-4" />
            {t("properties.view.grid")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={viewToggleClass(viewMode === "list")}
            aria-pressed={viewMode === "list"}
            onClick={() => persistView("list")}
          >
            <List className="mr-1.5 h-4 w-4" />
            {t("properties.view.list")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={viewToggleClass(viewMode === "calendar")}
            aria-pressed={viewMode === "calendar"}
            onClick={() => persistView("calendar")}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" />
            {t("properties.calendarIndex.view.calendar")}
          </Button>
        </div>
      </div>

      {loading ? (
        viewMode === "list" ? (
          skeletonList
        ) : viewMode === "calendar" ? (
          skeletonCalendarLayout
        ) : (
          skeletonGrid
        )
      ) : filtered.length === 0 ? (
        emptyState
      ) : viewMode === "list" ? (
        <div
          className={cn(
            "overflow-hidden rounded-xl border",
            isLight ? "border-slate-200/90 bg-white" : "border-white/10 bg-white/[0.02]"
          )}
        >
          {filtered.map((property) => (
            <div
              key={property._id}
              className={cn(
                "flex cursor-pointer flex-wrap items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 sm:px-4 sm:py-3",
                isLight
                  ? "border-slate-100 hover:bg-slate-50"
                  : "border-white/10 hover:bg-white/5"
              )}
              onClick={() => openPropertyCalendar(property._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPropertyCalendar(property._id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-medium",
                    isLight ? "text-slate-900" : "text-foreground"
                  )}
                >
                  {property.name}
                </p>
                {property.address && (
                  <p
                    className={cn(
                      "mt-0.5 flex items-center gap-1 truncate text-xs sm:text-sm",
                      isLight ? "text-slate-600" : "text-muted-foreground"
                    )}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {[property.address.city, property.address.state]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {property.status && (
                  <Badge
                    variant="secondary"
                    className={cn("text-xs capitalize", getStatusColor(property.status))}
                  >
                    {property.status}
                  </Badge>
                )}
                {property.units && (
                  <span
                    className={cn(
                      "hidden text-xs sm:inline",
                      isLight ? "text-slate-500" : "text-muted-foreground"
                    )}
                  >
                    {property.units.length}{" "}
                    {property.units.length === 1 ? "unit" : "units"}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPropertyCalendar(property._id);
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("properties.calendarIndex.openCalendar")}
                  </span>
                </Button>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 opacity-50",
                    isLight ? "text-slate-400" : "text-muted-foreground"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="space-y-4">
            <Card
              className={cn(
                isLight ? "border-slate-200/90" : "border-white/10"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={cn("text-base", isLight ? "text-slate-900" : "text-foreground")}
                >
                  {t("properties.calendarIndex.browseMonth")}
                </CardTitle>
                <CardDescription className={cn(isLight ? "text-slate-600" : "")}>
                  {t("properties.calendarIndex.browseMonthHint")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-4 pt-0">
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={pickerDate}
                  onSelect={setPickerDate}
                  className={cn(
                    "rounded-lg border p-2",
                    isLight ? "border-slate-200/90" : "border-white/10"
                  )}
                />
              </CardContent>
            </Card>
            <Card
              className={cn(
                isLight ? "border-sky-200/60 bg-sky-50/40" : "border-sky-500/20 bg-sky-950/20"
              )}
            >
              <CardContent className="p-4">
                <p
                  className={cn(
                    "text-sm",
                    isLight ? "text-slate-700" : "text-sky-100/90"
                  )}
                >
                  {t("properties.calendarIndex.stayFinderHint")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  asChild
                >
                  <Link href="/dashboard/properties/stay-finder">
                    {t("properties.calendarIndex.stayFinderCta")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="min-w-0 space-y-2">
            <p
              className={cn(
                "text-sm font-medium",
                isLight ? "text-slate-700" : "text-white/85"
              )}
            >
              {t("properties.view.list")}
            </p>
            {filtered.map((property) => (
              <Card
                key={property._id}
                className={cn(
                  "cursor-pointer transition-shadow hover:shadow-md",
                  isLight
                    ? "border-slate-200/90 hover:border-sky-300/60"
                    : "border-white/10 hover:border-primary/30"
                )}
                onClick={() => openPropertyCalendar(property._id)}
              >
                <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white/80"
                    )}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "truncate text-sm font-semibold sm:text-base",
                        isLight ? "text-slate-900" : "text-foreground"
                      )}
                    >
                      {property.name}
                    </h3>
                    {property.address && (
                      <p
                        className={cn(
                          "mt-0.5 flex items-center gap-1 truncate text-xs",
                          isLight ? "text-slate-600" : "text-muted-foreground"
                        )}
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[property.address.city, property.address.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {property.status && (
                        <Badge
                          variant="secondary"
                          className={cn("text-xs capitalize", getStatusColor(property.status))}
                        >
                          {property.status}
                        </Badge>
                      )}
                      {property.units && (
                        <span
                          className={cn(
                            "text-xs",
                            isLight ? "text-slate-500" : "text-muted-foreground"
                          )}
                        >
                          {property.units.length}{" "}
                          {property.units.length === 1 ? "unit" : "units"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPropertyCalendar(property._id);
                    }}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("properties.calendarIndex.openCalendar")}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <Card
              key={property._id}
              className={cn(
                "cursor-pointer transition-shadow hover:shadow-md",
                isLight
                  ? "border-slate-200/90 hover:border-sky-300/60"
                  : "border hover:border-primary/30"
              )}
              onClick={() => openPropertyCalendar(property._id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "truncate text-base font-semibold",
                        isLight ? "text-slate-900" : "text-foreground"
                      )}
                    >
                      {property.name}
                    </h3>
                    {property.address && (
                      <p
                        className={cn(
                          "mt-1 flex items-center gap-1 text-sm",
                          isLight ? "text-slate-600" : "text-muted-foreground"
                        )}
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {[property.address.city, property.address.state]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className={cn(
                      "ml-2 h-5 w-5 shrink-0",
                      isLight ? "text-slate-400" : "text-muted-foreground"
                    )}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {property.status && (
                    <Badge
                      variant="secondary"
                      className={getStatusColor(property.status)}
                    >
                      {property.status}
                    </Badge>
                  )}
                  {property.units && (
                    <span
                      className={cn(
                        "text-xs",
                        isLight ? "text-slate-500" : "text-muted-foreground"
                      )}
                    >
                      {property.units.length}{" "}
                      {property.units.length === 1 ? "unit" : "units"}
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "mt-3 border-t pt-3",
                    isLight ? "border-slate-200/90" : "border-border"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-center",
                      isLight
                        ? "text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                        : "text-primary hover:text-primary"
                    )}
                  >
                    <CalendarDays className="mr-1 h-4 w-4" />
                    {t("properties.calendarIndex.openCalendar")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

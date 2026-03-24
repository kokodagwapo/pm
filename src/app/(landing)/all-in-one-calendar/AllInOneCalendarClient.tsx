"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { VacationStayCard, VacationStayCardProperty } from "@/components/landing/VacationStayCard";
import { LandingHeader } from "@/components/landing/LandingHeader";

function toYmd(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

function parseYmd(s: string | null): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return undefined;
  }
  return dt;
}

export function AllInOneCalendarClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkIn, setCheckIn] = useState<Date | undefined>(() =>
    parseYmd(searchParams.get("checkIn"))
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(() =>
    parseYmd(searchParams.get("checkOut"))
  );
  const [adults, setAdults] = useState(
    Math.max(1, parseInt(searchParams.get("adults") || "2", 10) || 2)
  );
  const [children, setChildren] = useState(
    Math.max(0, parseInt(searchParams.get("children") || "0", 10) || 0)
  );
  const [infants, setInfants] = useState(
    Math.max(0, parseInt(searchParams.get("infants") || "0", 10) || 0)
  );

  const [properties, setProperties] = useState<VacationStayCardProperty[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filteredMode, setFilteredMode] = useState(false);

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    const ci = toYmd(checkIn);
    const co = toYmd(checkOut);
    if (ci) p.set("checkIn", ci);
    if (co) p.set("checkOut", co);
    if (adults !== 2) p.set("adults", String(adults));
    if (children) p.set("children", String(children));
    if (infants) p.set("infants", String(infants));
    const q = p.toString();
    router.replace(q ? `/all-in-one-calendar?${q}` : "/all-in-one-calendar", {
      scroll: false,
    });
  }, [checkIn, checkOut, adults, children, infants, router]);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setFilteredMode(false);
    try {
      const res = await fetch("/api/properties/public?limit=24");
      const json = await res.json();
      const data = json?.data ?? json;
      setProperties(data?.properties ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAvailabilitySearch = useCallback(async () => {
    const ci = toYmd(checkIn);
    const co = toYmd(checkOut);
    if (!ci || !co) return;
    setSearching(true);
    setFilteredMode(true);
    syncUrl();
    try {
      const u = new URLSearchParams({ checkIn: ci, checkOut: co });
      const res = await fetch(
        `/api/properties/public/available-for-stay?${u.toString()}`
      );
      const json = await res.json();
      if (!res.ok) {
        setProperties([]);
        return;
      }
      const data = json?.data ?? json;
      setProperties(data?.properties ?? []);
    } catch {
      setProperties([]);
    } finally {
      setSearching(false);
    }
  }, [checkIn, checkOut, syncUrl]);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  useEffect(() => {
    const ci = searchParams.get("checkIn");
    const co = searchParams.get("checkOut");
    if (ci && co) {
      setCheckIn(parseYmd(ci));
      setCheckOut(parseYmd(co));
    }
  }, [searchParams]);

  const guestLabel = useMemo(() => {
    const total = adults + children + infants;
    if (total <= 0) return "Guests";
    return `${total} guest${total === 1 ? "" : "s"}`;
  }, [adults, children, infants]);

  return (
    <>
      <LandingHeader />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[calc(3rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="mb-10 text-center sm:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700/90">
          SmartStart PM · Stay finder
        </p>
        <h1
          className="mt-3 text-balance text-3xl font-light tracking-tight text-slate-900 sm:text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-playfair), ui-serif, Georgia, serif" }}
        >
          Rentals &amp; availability in one place
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
          Inspired by the guest-first flow on{" "}
          <a
            href="https://vms-florida.com/all-in-one-calendar/"
            className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700"
            target="_blank"
            rel="noreferrer"
          >
            VMS Florida Realty
          </a>
          : pick dates, party size, then browse places that fit your window.
        </p>
      </div>

      {/* Search bar — VMS-style unified strip */}
      <div
        className={cn(
          "relative z-[1] mx-auto mb-12 max-w-4xl rounded-2xl border border-white/40 bg-white/80 p-3 shadow-lg shadow-teal-900/10 backdrop-blur-md",
          "sm:p-4"
        )}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-3">
          <div className="lg:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Check-in
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start border-slate-200 bg-white text-left font-normal text-slate-900"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
                  {checkIn ? format(checkIn, "MMM d, yyyy") : "Add date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={setCheckIn}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Check-out
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-start border-slate-200 bg-white text-left font-normal text-slate-900"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
                  {checkOut ? format(checkOut, "MMM d, yyyy") : "Add date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(d) => {
                    const min = checkIn
                      ? new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + 1)
                      : new Date(new Date().setHours(0, 0, 0, 0));
                    return d < min;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Guests
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-full justify-between border-slate-200 bg-white font-normal text-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    {guestLabel}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <GuestRow
                  label="Adults"
                  sub="Ages 13+"
                  value={adults}
                  min={1}
                  onChange={setAdults}
                />
                <GuestRow
                  label="Children"
                  sub="Ages 2–12"
                  value={children}
                  min={0}
                  onChange={setChildren}
                />
                <GuestRow
                  label="Infants"
                  sub="Under 2"
                  value={infants}
                  min={0}
                  onChange={setInfants}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-3">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-900/20 hover:from-teal-700 hover:to-cyan-700"
              disabled={searching || !checkIn || !checkOut}
              onClick={runAvailabilitySearch}
            >
              {searching ? "Searching…" : "Check availability"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          Rates shown are estimates from unit rent fields. Taxes, fees, and final
          confirmation may apply — same idea as on public STR sites.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-slate-900 sm:text-xl">
          {filteredMode
            ? "Available for your dates"
            : "Available properties"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/auth/signin">Manager login</Link>
          </Button>
          {filteredMode && (
            <Button variant="ghost" size="sm" onClick={loadBrowse}>
              Show all listings
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl bg-slate-200/60"
            />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600">
          No properties match right now. Try different dates or browse all
          listings.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <VacationStayCard
              key={p._id}
              property={p}
              checkIn={toYmd(checkIn)}
              checkOut={toYmd(checkOut)}
              adults={adults}
              children={children}
              infants={infants}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}

function GuestRow({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

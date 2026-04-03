"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type {
  StayResultProperty,
  StayZeroResultHint,
} from "./stay-finder-types";

export const STAY_FINDER_PARKING_TYPES = [
  "garage",
  "covered",
  "open",
  "street",
] as const;

export function toYmd(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function parseStayParamDate(s: string | null): Date | undefined {
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

export type UsePublicStaySearchArgs = {
  /** Route path for URL updates, e.g. /all-in-one-calendar or /rentals */
  pathnameBase: string;
  /** When true, merge stay params into existing query string (View Rentals). */
  mergeUrl?: boolean;
  /** Query string for browse fetch (without leading ?). Default: limit=24 */
  getBrowseQueryString?: () => string;
  /** Extra params for available-for-stay (e.g. bedrooms from rentals filters). */
  getAvailabilityExtraParams?: () => Record<string, string>;
};

export function usePublicStaySearch({
  pathnameBase,
  mergeUrl = false,
  getBrowseQueryString,
  getAvailabilityExtraParams,
}: UsePublicStaySearchArgs) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkIn, setCheckIn] = useState<Date | undefined>(() =>
    parseStayParamDate(searchParams.get("checkIn"))
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(() =>
    parseStayParamDate(searchParams.get("checkOut"))
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
  const [parkingType, setParkingType] = useState(() => {
    const pt = searchParams.get("parkingType") || "";
    return STAY_FINDER_PARKING_TYPES.includes(
      pt as (typeof STAY_FINDER_PARKING_TYPES)[number]
    )
      ? pt
      : "";
  });

  const [properties, setProperties] = useState<StayResultProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filteredMode, setFilteredMode] = useState(false);
  const [zeroResultHints, setZeroResultHints] = useState<StayZeroResultHint[]>(
    []
  );
  const [browsePagination, setBrowsePagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
  });

  const replaceStayUrl = useCallback(
    (cin?: Date, cout?: Date, parkingOverride?: string) => {
      const ci = toYmd(cin ?? checkIn);
      const co = toYmd(cout ?? checkOut);
      const pt =
        parkingOverride !== undefined ? parkingOverride : parkingType;

      if (mergeUrl) {
        const next = new URLSearchParams(searchParams.toString());
        if (ci) next.set("checkIn", ci);
        else next.delete("checkIn");
        if (co) next.set("checkOut", co);
        else next.delete("checkOut");
        if (adults !== 2) next.set("adults", String(adults));
        else next.delete("adults");
        if (children) next.set("children", String(children));
        else next.delete("children");
        if (infants) next.set("infants", String(infants));
        else next.delete("infants");
        if (pt) next.set("parkingType", pt);
        else next.delete("parkingType");
        const q = next.toString();
        router.replace(q ? `${pathnameBase}?${q}` : pathnameBase, {
          scroll: false,
        });
      } else {
        const p = new URLSearchParams();
        if (ci) p.set("checkIn", ci);
        if (co) p.set("checkOut", co);
        if (adults !== 2) p.set("adults", String(adults));
        if (children) p.set("children", String(children));
        if (infants) p.set("infants", String(infants));
        if (pt) p.set("parkingType", pt);
        const q = p.toString();
        router.replace(q ? `${pathnameBase}?${q}` : pathnameBase, {
          scroll: false,
        });
      }
    },
    [
      checkIn,
      checkOut,
      adults,
      children,
      infants,
      parkingType,
      router,
      pathnameBase,
      mergeUrl,
      searchParams,
    ]
  );

  const defaultBrowseQs = useCallback(() => "limit=24", []);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setFilteredMode(false);
    setZeroResultHints([]);
    try {
      const qs = (getBrowseQueryString ?? defaultBrowseQs)();
      const res = await fetch(`/api/properties/public?${qs}`);
      const json = await res.json();
      const data = json?.data ?? json;
      setProperties(data?.properties ?? []);
      setBrowsePagination(
        data?.pagination ?? {
          page: 1,
          total: (data?.properties ?? []).length,
          pages: 1,
        }
      );
    } catch {
      setProperties([]);
      setBrowsePagination({ page: 1, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  }, [getBrowseQueryString, defaultBrowseQs]);

  const runAvailabilitySearch = useCallback(
    async (override?: { checkIn: Date; checkOut: Date }) => {
      const cin = override?.checkIn ?? checkIn;
      const cout = override?.checkOut ?? checkOut;
      const ci = toYmd(cin);
      const co = toYmd(cout);
      if (!ci || !co) return;
      if (override) {
        setCheckIn(cin);
        setCheckOut(cout);
      }
      setLoading(true);
      setSearching(true);
      setFilteredMode(true);
      replaceStayUrl(cin, cout);
      setZeroResultHints([]);
      try {
        const u = new URLSearchParams({ checkIn: ci, checkOut: co });
        if (parkingType) u.set("parkingType", parkingType);
        const extra = getAvailabilityExtraParams?.() ?? {};
        Object.entries(extra).forEach(([k, v]) => {
          if (v) u.set(k, v);
        });
        const res = await fetch(
          `/api/properties/public/available-for-stay?${u.toString()}`
        );
        const json = await res.json();
        if (!res.ok) {
          setProperties([]);
          setZeroResultHints([]);
          setBrowsePagination({ page: 1, total: 0, pages: 1 });
          return;
        }
        const data = json?.data ?? json;
        const list = data?.properties ?? [];
        setProperties(list);
        setZeroResultHints(data?.zeroResultHints ?? []);
        setBrowsePagination({
          page: 1,
          total: list.length,
          pages: 1,
        });
      } catch {
        setProperties([]);
        setZeroResultHints([]);
        setBrowsePagination({ page: 1, total: 0, pages: 1 });
      } finally {
        setSearching(false);
        setLoading(false);
      }
    },
    [checkIn, checkOut, parkingType, replaceStayUrl, getAvailabilityExtraParams]
  );

  const runAvailabilitySearchRef = useRef(runAvailabilitySearch);
  runAvailabilitySearchRef.current = runAvailabilitySearch;
  const loadBrowseRef = useRef(loadBrowse);
  loadBrowseRef.current = loadBrowse;

  /** Avoid re-fetch loops when URL is amended with optional stay params (adults, etc.). */
  const dataFetchKey = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    const ci = sp.get("checkIn");
    const co = sp.get("checkOut");
    if (ci && co) {
      return [
        "avail",
        ci,
        co,
        sp.get("parkingType") || "",
        sp.get("bedrooms") || "",
        sp.get("type") || "",
        sp.get("neighborhood") || "",
        sp.get("search") || "",
        sp.get("minRent") || "",
        sp.get("maxRent") || "",
        sp.get("adults") || "",
        sp.get("children") || "",
        sp.get("infants") || "",
      ].join("|");
    }
    sp.delete("checkIn");
    sp.delete("checkOut");
    sp.delete("adults");
    sp.delete("children");
    sp.delete("infants");
    return `browse|${sp.toString()}`;
  }, [searchParams]);

  useEffect(() => {
    const ci = searchParams.get("checkIn");
    const co = searchParams.get("checkOut");
    if (ci && co) {
      setCheckIn(parseStayParamDate(ci));
      setCheckOut(parseStayParamDate(co));
    } else if (!mergeUrl) {
      setCheckIn(undefined);
      setCheckOut(undefined);
    }
    const pt = searchParams.get("parkingType") || "";
    setParkingType(
      STAY_FINDER_PARKING_TYPES.includes(
        pt as (typeof STAY_FINDER_PARKING_TYPES)[number]
      )
        ? pt
        : ""
    );
    setAdults(Math.max(1, parseInt(searchParams.get("adults") || "2", 10) || 2));
    setChildren(
      Math.max(0, parseInt(searchParams.get("children") || "0", 10) || 0)
    );
    setInfants(
      Math.max(0, parseInt(searchParams.get("infants") || "0", 10) || 0)
    );
  }, [searchParams, mergeUrl]);

  useEffect(() => {
    const ci = searchParams.get("checkIn");
    const co = searchParams.get("checkOut");
    if (ci && co) {
      const cin = parseStayParamDate(ci);
      const cout = parseStayParamDate(co);
      if (cin && cout) {
        void runAvailabilitySearchRef.current({
          checkIn: cin,
          checkOut: cout,
        });
      }
    } else {
      void loadBrowseRef.current();
    }
  }, [dataFetchKey, searchParams]);

  const guestLabel = useMemo(() => {
    const total = adults + children + infants;
    if (total <= 0) return "Guests";
    return `${total} guest${total === 1 ? "" : "s"}`;
  }, [adults, children, infants]);

  const clearStayDatesFromUrl = useCallback(() => {
    setCheckIn(undefined);
    setCheckOut(undefined);
    if (mergeUrl) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("checkIn");
      next.delete("checkOut");
      next.delete("adults");
      next.delete("children");
      next.delete("infants");
      const q = next.toString();
      router.replace(q ? `${pathnameBase}?${q}` : pathnameBase, {
        scroll: false,
      });
    } else {
      router.replace(pathnameBase, { scroll: false });
    }
  }, [mergeUrl, searchParams, router, pathnameBase]);

  return {
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    adults,
    setAdults,
    children,
    setChildren,
    infants,
    setInfants,
    parkingType,
    setParkingType,
    guestLabel,
    properties,
    loading,
    searching,
    filteredMode,
    zeroResultHints,
    setFilteredMode,
    loadBrowse,
    runAvailabilitySearch,
    replaceStayUrl,
    clearStayDatesFromUrl,
    browsePagination,
  };
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LunaWidget } from "@/components/landing/LunaWidget";
import {
  Bed,
  Bath,
  MapPin,
  ArrowLeft,
  X,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Users,
  Home,
  Wifi,
  Car,
  Waves,
  Tv,
  UtensilsCrossed,
  Wind,
  WashingMachine,
  ShieldCheck,
  Phone,
  Mail,
  Share2,
  Heart,
  Grid3X3,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Send,
} from "lucide-react";
import {
  AvailabilityCalendar,
  CalendarBlock,
  CalendarPricingRule,
  DateSelection,
} from "@/components/calendar/AvailabilityCalendar";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPriceExact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getRentDisplay(property: any): string {
  const units = property?.units;
  if (!units?.length) return "Contact for pricing";
  const rents = units.map((u: any) => u?.rentAmount).filter((r: number) => r != null);
  if (!rents.length) return "Contact for pricing";
  const min = Math.min(...rents);
  const max = Math.max(...rents);
  if (min === max) return formatPrice(min > 500 ? min : min * 30);
  return `${formatPrice(min > 500 ? min : min * 30)} - ${formatPrice(max > 500 ? max : max * 30)}`;
}

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  "wireless internet": Wifi,
  internet: Wifi,
  parking: Car,
  "free parking": Car,
  pool: Waves,
  tv: Tv,
  "tv in living room": Tv,
  "tv in master bedroom": Tv,
  kitchen: UtensilsCrossed,
  "air conditioner": Wind,
  "air conditioning": Wind,
  washer: WashingMachine,
  "washing machine": WashingMachine,
};

function getAmenityIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return CheckCircle2;
}

const NAV_SECTIONS = [
  { id: "description", label: "Description" },
  { id: "pricing", label: "Pricing" },
  { id: "details", label: "Details" },
  { id: "amenities", label: "Amenities" },
  { id: "availability", label: "Availability" },
  { id: "map", label: "Map" },
];

interface PricingResult {
  totalNights: number;
  basePrice: number;
  calculatedPrice: number;
  averagePricePerNight: number;
  discountsApplied: Array<{ type: string; label: string; amount: number; percentage?: number }>;
  minimumStay?: number;
}

interface InquiryForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export function PropertyDetailClient({
  id,
  initialProperty,
}: {
  id: string;
  initialProperty?: any;
}) {
  const [property, setProperty] = useState<any>(initialProperty ?? null);
  const [loading, setLoading] = useState(!initialProperty);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [activeSection, setActiveSection] = useState("description");
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedDates, setSelectedDates] = useState<DateSelection | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryForm, setInquiryForm] = useState<InquiryForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<{
    success: boolean;
    ref?: string;
    error?: string;
  } | null>(null);

  const inquirySectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProperty) return;
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/properties/public/${id}`)
      .then((res) => {
        if (!res.ok) {
          setError(res.status === 404 ? "not_found" : "failed");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success && data.data) setProperty(data.data);
        else if (data !== null) setError("not_found");
      })
      .catch(() => setError("failed"))
      .finally(() => setLoading(false));
  }, [id, initialProperty]);

  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.[0]?.lat && data?.[0]?.lon) {
        setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      } else {
        setMapCoords({ lat: 26.142, lon: -81.7948 });
      }
    } catch {
      setMapCoords({ lat: 26.142, lon: -81.7948 });
    }
  }, []);

  const units = property?.units || [];
  const unit = units[selectedUnitIndex] || units[0];
  const address = property?.address;
  const fullAddress = address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
    : "";

  useEffect(() => {
    if (fullAddress && fullAddress.trim().length > 5) geocodeAddress(fullAddress);
  }, [fullAddress, geocodeAddress]);

  useEffect(() => {
    const handleScroll = () => {
      const offset = 160;
      for (const section of [...NAV_SECTIONS].reverse()) {
        const el = sectionRefs.current[section.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const calendarBlocks: CalendarBlock[] = useMemo(() => {
    if (!property?.availability?.blocks || !unit?._id) return [];
    const unitId = unit._id.toString();
    return property.availability.blocks
      .filter((b: any) => b.unitId?.toString() === unitId)
      .map((b: any) => ({
        _id: b._id,
        startDate: b.startDate,
        endDate: b.endDate,
        blockType: b.blockType,
      }));
  }, [property?.availability?.blocks, unit?._id]);

  const calendarPricingRules: CalendarPricingRule[] = useMemo(() => {
    if (!property?.availability?.pricingRules || !unit?._id) return [];
    const unitId = unit._id.toString();
    return property.availability.pricingRules
      .filter((r: any) => r.unitId?.toString() === unitId)
      .map((r: any) => ({
        _id: r._id,
        name: r.name,
        ruleType: r.ruleType,
        startDate: r.startDate,
        endDate: r.endDate,
        pricePerNight: r.pricePerNight,
        priceModifier: r.priceModifier,
        daysOfWeek: r.daysOfWeek,
        minimumStay: r.minimumStay,
        isActive: true,
      }));
  }, [property?.availability?.pricingRules, unit?._id]);

  const baseRentPerNight = useMemo(() => {
    if (!unit?.rentAmount) return 0;
    return unit.rentAmount / 30;
  }, [unit?.rentAmount]);

  const seasonalPricingSummary = useMemo(() => {
    return calendarPricingRules
      .filter((r) => r.ruleType === "seasonal" && r.startDate && r.endDate)
      .map((r) => ({
        name: r.name,
        startDate: new Date(r.startDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        endDate: new Date(r.endDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: r.pricePerNight,
        modifier: r.priceModifier,
      }));
  }, [calendarPricingRules]);

  const fetchPricing = useCallback(
    async (dates: DateSelection, coupon?: string) => {
      if (!property?._id || !unit?._id) return;
      setPricingLoading(true);
      setPricingError(null);
      setCouponError(null);
      try {
        const res = await fetch("/api/pricing/calculate-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: property._id.toString(),
            unitId: unit._id.toString(),
            startDate: dates.startDate.toISOString(),
            endDate: dates.endDate.toISOString(),
            ...(coupon ? { couponCode: coupon } : {}),
          }),
        });
        const data = await res.json();
        if (data?.success && data.data) {
          setPricingResult(data.data);
        } else {
          setPricingError(data?.error || "Could not calculate pricing");
          setPricingResult(null);
        }
      } catch {
        setPricingError("Could not calculate pricing");
        setPricingResult(null);
      } finally {
        setPricingLoading(false);
        setCouponApplying(false);
      }
    },
    [property?._id, unit?._id]
  );

  const handleDateSelect = useCallback(
    (selection: DateSelection) => {
      setSelectedDates(selection);
      setPricingResult(null);
      setInquiryResult(null);
      setCouponCode("");
      setCouponInput("");
      setCouponError(null);
      fetchPricing(selection);
    },
    [fetchPricing]
  );

  const handleApplyCoupon = useCallback(() => {
    if (!couponInput.trim() || !selectedDates) return;
    setCouponApplying(true);
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    setCouponCode(code);
    fetchPricing(selectedDates, code).then(() => {
      setCouponApplying(false);
    });
  }, [couponInput, selectedDates, fetchPricing]);

  const handleUnitChange = (index: number) => {
    setSelectedUnitIndex(index);
    setSelectedDates(null);
    setPricingResult(null);
    setPricingError(null);
    setInquiryResult(null);
    setShowInquiryForm(false);
  };

  const stayNudge = useMemo(() => {
    if (!pricingResult) return null;
    const n = pricingResult.totalNights;
    if (n >= 5 && n < 7) return { add: 7 - n, label: "weekly discount", nights: 7 };
    if (n >= 25 && n < 30) return { add: 30 - n, label: "monthly discount", nights: 30 };
    return null;
  }, [pricingResult]);

  const formatDateRange = (start: Date, end: Date) =>
    `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDates || !property || !unit) return;
    setInquirySubmitting(true);
    setInquiryResult(null);
    try {
      const res = await fetch("/api/inquiries/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property._id.toString(),
          unitId: unit._id.toString(),
          startDate: selectedDates.startDate.toISOString(),
          endDate: selectedDates.endDate.toISOString(),
          ...inquiryForm,
          pricingSnapshot: pricingResult,
        }),
      });
      const data = await res.json();
      if (data?.success && data.data) {
        setInquiryResult({ success: true, ref: data.data.inquiryRef });
        setInquiryForm({ firstName: "", lastName: "", email: "", phone: "", message: "" });
        setShowInquiryForm(false);
      } else {
        setInquiryResult({ success: false, error: data?.error || "Submission failed. Please try again." });
      }
    } catch {
      setInquiryResult({ success: false, error: "Could not submit inquiry. Please try again." });
    } finally {
      setInquirySubmitting(false);
    }
  };

  const scrollToInquiry = useCallback(() => {
    setShowInquiryForm(true);
    setTimeout(() => {
      inquirySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const images = property?.images?.length
    ? property.images
    : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80"];

  const propertyType = property?.type
    ? String(property.type).charAt(0).toUpperCase() + String(property.type).slice(1)
    : null;
  const status = property?.status;
  const lat = mapCoords?.lat ?? 26.142;
  const lon = mapCoords?.lon ?? -81.7948;
  const bbox = `${lon - 0.02},${lat - 0.02},${lon + 0.02},${lat + 0.02}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;

  const lunaPropertyContext = useMemo(() => ({
    propertyId: id,
    propertyName: property?.name || "this property",
    neighborhood: property?.neighborhood,
    pricePerMonth: unit?.rentAmount,
    pricePerNight: baseRentPerNight || undefined,
    bedrooms: unit?.bedrooms,
    bathrooms: unit?.bathrooms,
    availabilityStatus: status,
  }), [id, property?.name, property?.neighborhood, unit?.rentAmount, unit?.bedrooms, unit?.bathrooms, baseRentPerNight, status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <LandingHeader />
        <main className="pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-5 w-28 bg-slate-200 rounded" />
              <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px]">
                <div className="col-span-2 row-span-2 rounded-l-2xl bg-slate-200" />
                <div className="rounded-none bg-slate-200" />
                <div className="rounded-tr-2xl bg-slate-200" />
                <div className="rounded-none bg-slate-200" />
                <div className="rounded-br-2xl bg-slate-200" />
              </div>
              <div className="h-10 w-3/4 bg-slate-200 rounded" />
              <div className="h-5 w-1/2 bg-slate-200 rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="min-h-screen bg-white">
        <LandingHeader />
        <main className="pt-20 pb-16 flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Home className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error === "not_found" ? "Property not found" : "Unable to load property"}
            </h2>
            <p className="text-slate-500 mb-6">
              {error === "not_found"
                ? "This property may have been removed or the link is incorrect."
                : "Please try again later."}
            </p>
            <Link
              href="/rentals"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Rentals
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const totalGuests = unit ? (unit.bedrooms || 1) * 2 : 2;

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-5 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all properties
          </Link>

          <div className="relative mb-6">
            {images.length <= 1 ? (
              <div className="relative rounded-2xl overflow-hidden h-[420px]">
                <img
                  src={images[0]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
                <div
                  className="col-span-2 row-span-2 relative cursor-pointer group"
                  onClick={() => { setGalleryIndex(0); setShowAllPhotos(true); }}
                >
                  <img
                    src={images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                {images.slice(1, 5).map((img: string, i: number) => (
                  <div
                    key={i}
                    className="relative cursor-pointer group overflow-hidden"
                    onClick={() => { setGalleryIndex(i + 1); setShowAllPhotos(true); }}
                  >
                    <img
                      src={img}
                      alt={`${property.name} ${i + 2}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {i === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">+{images.length - 5} more</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {images.length > 1 && (
              <button
                onClick={() => setShowAllPhotos(true)}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg text-slate-800 text-sm font-medium hover:bg-white transition-colors border border-slate-200"
              >
                <Grid3X3 className="w-4 h-4" />
                See all {images.length} photos
              </button>
            )}
          </div>

          <div className="sticky top-[72px] z-30 bg-white border-b border-slate-200 -mx-4 md:-mx-8 px-4 md:px-8 mb-8">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar py-1">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                    activeSection === section.id
                      ? "text-sky-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {section.label}
                  {activeSection === section.id && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 min-w-0">
              <div ref={(el) => { sectionRefs.current.description = el; }}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {propertyType && (
                    <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-sm font-medium border border-sky-100">
                      {propertyType}
                    </span>
                  )}
                  {status && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : status === "OCCUPIED"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {String(status).charAt(0) + String(status).slice(1).toLowerCase()}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 leading-tight">
                  {property.name}
                </h1>

                {address && (
                  <p className="flex items-center gap-2 text-slate-500 mb-5 text-sm">
                    <MapPin className="w-4 h-4 shrink-0 text-sky-500" />
                    {fullAddress}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pb-8 mb-8 border-b border-slate-100">
                  {unit && (
                    <>
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
                          <Users className="w-4 h-4 text-sky-600" />
                        </div>
                        <span className="text-sm font-medium">{totalGuests} Guests</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                          <Bed className="w-4 h-4 text-violet-600" />
                        </div>
                        <span className="text-sm font-medium">{unit.bedrooms} Bedrooms</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                          <Bath className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-sm font-medium">{unit.bathrooms} Bathrooms</span>
                      </div>
                      {unit.squareFootage && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Home className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium">{unit.squareFootage} sq ft</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {property.description && (
                  <div className="mb-10">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Property Description</h2>
                    <div className="relative">
                      <p className={`text-slate-600 leading-relaxed whitespace-pre-line ${
                        !descExpanded && property.description.length > 400 ? "line-clamp-5" : ""
                      }`}>
                        {property.description}
                      </p>
                      {property.description.length > 400 && (
                        <button
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="mt-2 text-sky-600 font-medium text-sm hover:text-sky-700 transition-colors"
                        >
                          {descExpanded ? "Show less" : "View more"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {units.length > 0 && (
                  <div className="mb-10">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Sleeping Arrangement</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {units.map((u: any, i: number) => (
                        <div
                          key={u._id || i}
                          className="rounded-xl border border-slate-200 p-4 text-center hover:border-sky-200 hover:bg-sky-50/30 transition-colors"
                        >
                          <Bed className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-800">
                            {u.unitNumber || `Bedroom ${i + 1}`}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {u.bedrooms || 1} Bed{(u.bedrooms || 1) > 1 ? "s" : ""} / {u.bathrooms || 1} Bath
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div ref={(el) => { sectionRefs.current.pricing = el; }}>
                {(baseRentPerNight > 0 || seasonalPricingSummary.length > 0) && (
                  <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-sky-500" />
                        Pricing
                      </h2>
                    </div>
                    <div className="p-6">
                      {baseRentPerNight > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                          <span className="text-slate-600">Base rate</span>
                          <span className="font-semibold text-slate-900">
                            {formatPrice(Math.round(baseRentPerNight))} <span className="text-sm font-normal text-slate-500">/ night</span>
                          </span>
                        </div>
                      )}
                      {seasonalPricingSummary.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Seasonal Rates
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="text-left py-2 font-medium text-slate-500">Period</th>
                                  <th className="text-right py-2 font-medium text-slate-500">Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {seasonalPricingSummary.map((s, i) => (
                                  <tr key={i} className="border-b border-slate-50 last:border-0">
                                    <td className="py-3">
                                      <span className="font-medium text-slate-800">{s.name}</span>
                                      <span className="text-slate-400 ml-2 text-xs">
                                        {s.startDate} – {s.endDate}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right font-semibold text-slate-900">
                                      {s.price
                                        ? `${formatPrice(s.price)}/night`
                                        : s.modifier
                                        ? `${s.modifier.value > 0 ? "+" : ""}${
                                            s.modifier.type === "percentage"
                                              ? `${s.modifier.value}%`
                                              : formatPrice(s.modifier.value)
                                          }`
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={(el) => { sectionRefs.current.details = el; }}>
                {address && (
                  <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900">Property Address</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        {address.street && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">Address</span>
                            <p className="text-slate-800 font-medium mt-1">{address.street}</p>
                          </div>
                        )}
                        {address.city && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">City</span>
                            <p className="text-slate-800 font-medium mt-1">{address.city}</p>
                          </div>
                        )}
                        {property.neighborhood && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">Area</span>
                            <p className="text-slate-800 font-medium mt-1">{property.neighborhood}</p>
                          </div>
                        )}
                        {address.state && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">State</span>
                            <p className="text-slate-800 font-medium mt-1">{address.state}</p>
                          </div>
                        )}
                        {address.zipCode && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">Zip</span>
                            <p className="text-slate-800 font-medium mt-1">{address.zipCode}</p>
                          </div>
                        )}
                        {address.country && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">Country</span>
                            <p className="text-slate-800 font-medium mt-1">{address.country}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {unit && (
                  <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900">Property Details</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs uppercase tracking-wider">Bedrooms</span>
                          <p className="text-slate-800 font-medium mt-1">{unit.bedrooms}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs uppercase tracking-wider">Bathrooms</span>
                          <p className="text-slate-800 font-medium mt-1">{unit.bathrooms}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs uppercase tracking-wider">Guests</span>
                          <p className="text-slate-800 font-medium mt-1">{totalGuests}</p>
                        </div>
                        {unit.squareFootage && (
                          <div>
                            <span className="text-slate-400 text-xs uppercase tracking-wider">Area</span>
                            <p className="text-slate-800 font-medium mt-1">{unit.squareFootage} sq ft</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={(el) => { sectionRefs.current.amenities = el; }}>
                {property.amenities?.length > 0 && (
                  <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900">Amenities & Features</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {property.amenities.map((a: any, i: number) => {
                          const Icon = getAmenityIcon(a.name || "");
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                              <Icon className="w-4 h-4 text-sky-500 shrink-0" />
                              <span className="text-sm text-slate-700">{a.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={(el) => { sectionRefs.current.availability = el; }}>
                <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-sky-500" />
                      Availability & Booking
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Select your dates to see real-time pricing
                    </p>
                  </div>
                  <div className="p-6">
                    {units.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {units.map((u: any, i: number) => (
                          <button
                            key={u._id || i}
                            onClick={() => handleUnitChange(i)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                              i === selectedUnitIndex
                                ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600"
                            }`}
                          >
                            {u.unitNumber || `Unit ${i + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <AvailabilityCalendar
                      blocks={calendarBlocks}
                      pricingRules={calendarPricingRules}
                      baseRentPerNight={baseRentPerNight}
                      readOnly={false}
                      showPricing={baseRentPerNight > 0}
                      showLegend
                      onDateSelect={handleDateSelect}
                    />
                  </div>
                </div>

                {selectedDates && (
                  <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden shadow-md">
                    {/* Header */}
                    <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                        </span>
                        Booking Summary
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedDates(null);
                          setPricingResult(null);
                          setPricingError(null);
                          setInquiryResult(null);
                          setShowInquiryForm(false);
                          setCouponCode("");
                          setCouponInput("");
                          setCouponError(null);
                          setShowCouponInput(false);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Clear selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-white">
                      {/* Date display */}
                      <div className="px-5 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-slate-100">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Check-in</p>
                          <p className="font-semibold text-slate-900 text-sm">
                            {selectedDates.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-px bg-slate-300" />
                            {pricingResult ? (
                              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold whitespace-nowrap">
                                {pricingResult.totalNights}n
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-slate-100" />
                            )}
                            <div className="w-6 h-px bg-slate-300" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Check-out</p>
                          <p className="font-semibold text-slate-900 text-sm">
                            {selectedDates.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>

                      {/* Pricing area */}
                      <div className="px-5 py-4">
                        {pricingLoading ? (
                          <div className="space-y-3 animate-pulse">
                            <div className="flex justify-between">
                              <div className="h-3.5 w-36 rounded bg-slate-100" />
                              <div className="h-3.5 w-16 rounded bg-slate-100" />
                            </div>
                            <div className="flex justify-between">
                              <div className="h-3.5 w-28 rounded bg-slate-100" />
                              <div className="h-3.5 w-16 rounded bg-slate-100" />
                            </div>
                            <div className="h-px bg-slate-100 my-2" />
                            <div className="flex justify-between">
                              <div className="h-4 w-12 rounded bg-slate-100" />
                              <div className="h-4 w-20 rounded bg-slate-100" />
                            </div>
                          </div>
                        ) : pricingError ? (
                          <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {pricingError}
                          </div>
                        ) : pricingResult ? (
                          <div className="space-y-0">
                            {/* Rate × nights */}
                            <div className="flex items-center justify-between py-2 text-sm">
                              <span className="text-slate-600">
                                {formatPrice(Math.round(pricingResult.averagePricePerNight))}/night
                                <span className="text-slate-400 ml-1">× {pricingResult.totalNights} night{pricingResult.totalNights !== 1 ? "s" : ""}</span>
                              </span>
                              <span className="font-medium text-slate-800">{formatPriceExact(pricingResult.basePrice)}</span>
                            </div>

                            {/* Discounts */}
                            {pricingResult.discountsApplied?.length > 0 && pricingResult.discountsApplied.map((d, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                                <span className="text-emerald-600 flex items-center gap-1.5 min-w-0">
                                  <Tag className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{d.label}</span>
                                  {d.percentage ? (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                      {d.percentage}% off
                                    </span>
                                  ) : null}
                                </span>
                                <span className="text-emerald-600 font-semibold ml-2 shrink-0">−{formatPriceExact(d.amount)}</span>
                              </div>
                            ))}

                            {/* Coupon applied */}
                            {couponCode && (
                              <div className="flex items-center justify-between py-1.5 text-sm">
                                <span className="text-emerald-600 flex items-center gap-1.5">
                                  <Tag className="w-3.5 h-3.5 shrink-0" />
                                  Promo: <span className="font-mono font-bold ml-1">{couponCode}</span>
                                  <button
                                    onClick={() => { setCouponCode(""); setCouponInput(""); if (selectedDates) fetchPricing(selectedDates); }}
                                    className="p-0.5 rounded text-emerald-400 hover:text-red-400 transition-colors"
                                    title="Remove coupon"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              </div>
                            )}

                            {/* Total */}
                            <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
                              <div>
                                <span className="font-bold text-slate-900 text-base">Total</span>
                                <span className="text-xs text-slate-400 ml-1.5">
                                  ({formatPriceExact(Math.round(pricingResult.calculatedPrice / pricingResult.totalNights))}/night avg)
                                </span>
                              </div>
                              <span className="text-xl font-extrabold text-slate-900">{formatPriceExact(pricingResult.calculatedPrice)}</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Stay nudge */}
                        {stayNudge && pricingResult && !pricingLoading && (
                          <div className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Add <strong>{stayNudge.add} more night{stayNudge.add > 1 ? "s" : ""}</strong> to unlock a <strong>{stayNudge.label}</strong>!
                            </p>
                          </div>
                        )}

                        {/* Coupon section */}
                        {!pricingLoading && selectedDates && (
                          <div className="mt-3">
                            {!showCouponInput ? (
                              <button
                                onClick={() => setShowCouponInput(true)}
                                className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium transition-colors"
                              >
                                <Tag className="w-3.5 h-3.5" />
                                Have a promo code?
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={couponInput}
                                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                                    placeholder="Enter promo code"
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-shadow uppercase"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleApplyCoupon}
                                    disabled={!couponInput.trim() || couponApplying}
                                    className="px-3 py-2 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                                  >
                                    {couponApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                                  </button>
                                  <button
                                    onClick={() => { setShowCouponInput(false); setCouponInput(""); setCouponError(null); }}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {couponError && (
                                  <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    {couponError}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inquiry success */}
                      {inquiryResult?.success && (
                        <div className="mx-5 mb-4 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-emerald-800 text-sm">Inquiry sent successfully!</p>
                            <p className="text-emerald-600 text-xs mt-0.5">
                              Ref: <strong>{inquiryResult.ref}</strong> · We'll be in touch within 24 hours.
                            </p>
                          </div>
                        </div>
                      )}

                      {inquiryResult?.error && (
                        <div className="mx-5 mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {inquiryResult.error}
                        </div>
                      )}

                      {/* Request button */}
                      {!inquiryResult?.success && (
                        <div className="px-5 pb-5 pt-1">
                          <button
                            onClick={() => setShowInquiryForm((v) => !v)}
                            disabled={pricingLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 transition-colors shadow-sm shadow-sky-500/20 text-sm"
                          >
                            <Mail className="w-4 h-4" />
                            Request this Rental
                            {showInquiryForm ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                          </button>
                          {pricingResult && (
                            <p className="text-center text-xs text-slate-400 mt-2">
                              No payment required now · Free inquiry
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={inquirySectionRef}>
                  {showInquiryForm && selectedDates && !inquiryResult?.success && (
                    <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                          <Send className="w-4 h-4 text-sky-500" />
                          Your Details
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">We'll contact you within 24 hours to confirm availability</p>
                      </div>
                      <form onSubmit={handleInquirySubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name *</label>
                            <input
                              type="text"
                              required
                              value={inquiryForm.firstName}
                              onChange={(e) => setInquiryForm((f) => ({ ...f, firstName: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                              placeholder="Jane"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name *</label>
                            <input
                              type="text"
                              required
                              value={inquiryForm.lastName}
                              onChange={(e) => setInquiryForm((f) => ({ ...f, lastName: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                              placeholder="Smith"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={inquiryForm.email}
                            onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                            placeholder="jane@email.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
                          <input
                            type="tel"
                            value={inquiryForm.phone}
                            onChange={(e) => setInquiryForm((f) => ({ ...f, phone: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Message (optional)</label>
                          <textarea
                            rows={3}
                            value={inquiryForm.message}
                            onChange={(e) => setInquiryForm((f) => ({ ...f, message: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all resize-none"
                            placeholder="Tell us about your plans or any questions you have…"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={inquirySubmitting}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm shadow-sky-500/20"
                        >
                          {inquirySubmitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                          ) : (
                            <><Send className="w-4 h-4" /> Send Inquiry</>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              <div ref={(el) => { sectionRefs.current.map = el; }}>
                <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-sky-500" />
                      Location
                    </h2>
                  </div>
                  <div className="relative">
                    <iframe
                      title="Property location"
                      width="100%"
                      height="400"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={mapSrc}
                    />
                  </div>
                  <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0 text-sky-500" />
                      {fullAddress || "Naples, FL"}
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Open in Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:w-[380px] shrink-0">
              <div className="sticky top-36">
                <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-6 bg-white">
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-slate-900">
                        {getRentDisplay(property)}
                      </span>
                      {getRentDisplay(property) !== "Contact for pricing" && (
                        <span className="text-slate-500 text-sm">/month</span>
                      )}
                    </div>
                    {baseRentPerNight > 0 && (
                      <p className="text-sm text-slate-400 mb-6">
                        From {formatPrice(Math.round(baseRentPerNight))}/night
                      </p>
                    )}

                    {selectedDates && pricingResult ? (
                      <div className="mb-4">
                        <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 mb-3">
                          <p className="text-xs text-sky-600 font-medium">Your selection</p>
                          <p className="text-sm text-slate-800 font-semibold mt-0.5">
                            {formatDateRange(selectedDates.startDate, selectedDates.endDate)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {pricingResult.totalNights} nights · {formatPriceExact(pricingResult.calculatedPrice)} total
                          </p>
                        </div>
                        <button
                          onClick={() => { setShowInquiryForm(true); scrollToInquiry(); }}
                          className="block w-full py-3.5 rounded-xl bg-sky-500 text-white font-semibold text-center hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/20 mb-2 text-sm"
                        >
                          Request this Rental
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => scrollToSection("availability")}
                        className="block w-full py-3.5 rounded-xl bg-sky-500 text-white font-semibold text-center hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/20 mb-3 text-sm"
                      >
                        Check Availability
                      </button>
                    )}

                    <Link
                      href="/contact"
                      className="block w-full py-3 rounded-xl bg-white text-slate-700 font-medium text-center border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                    >
                      Contact Us
                    </Link>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-400 text-center">
                      Select dates above to see instant pricing
                    </p>
                  </div>
                </div>

                {unit && (
                  <div className="mt-4 rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Facts</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Property type</span>
                        <span className="font-medium text-slate-800">{propertyType || "Rental"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Bedrooms</span>
                        <span className="font-medium text-slate-800">{unit.bedrooms}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Bathrooms</span>
                        <span className="font-medium text-slate-800">{unit.bathrooms}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Max guests</span>
                        <span className="font-medium text-slate-800">{totalGuests}</span>
                      </div>
                      {unit.squareFootage && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Area</span>
                          <span className="font-medium text-slate-800">{unit.squareFootage} sq ft</span>
                        </div>
                      )}
                      {property.neighborhood && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Neighborhood</span>
                          <span className="font-medium text-slate-800">{property.neighborhood}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-black/95" role="dialog" aria-modal="true">
          <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-4 py-3 shrink-0">
              <span className="text-white/70 text-sm font-medium">
                {galleryIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setShowAllPhotos(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                aria-label="Close gallery"
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
              <button
                onClick={() => setGalleryIndex((galleryIndex - 1 + images.length) % images.length)}
                className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={images[galleryIndex]}
                alt={`${property.name} - Photo ${galleryIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />

              <button
                onClick={() => setGalleryIndex((galleryIndex + 1) % images.length)}
                className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="shrink-0 py-3 px-4">
              <div className="flex gap-2 justify-center overflow-x-auto no-scrollbar">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      i === galleryIndex ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-75"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {property && (
        <LunaWidget
          propertyContext={lunaPropertyContext}
          onRequestBooking={scrollToInquiry}
        />
      )}
    </div>
  );
}

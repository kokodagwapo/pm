"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
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
} from "lucide-react";
import { AvailabilityCalendar, CalendarBlock, CalendarPricingRule } from "@/components/calendar/AvailabilityCalendar";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
                <div className="mb-10 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-sky-500" />
                      Availability
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Check available dates and pricing for this property
                    </p>
                  </div>
                  <div className="p-6">
                    {units.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-5">
                        {units.map((u: any, i: number) => (
                          <button
                            key={u._id || i}
                            onClick={() => setSelectedUnitIndex(i)}
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
                      readOnly
                      showPricing={baseRentPerNight > 0}
                      showLegend
                    />
                  </div>
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

                    <Link
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(`/dashboard/rentals/request?propertyId=${id}`)}`}
                      className="block w-full py-3.5 rounded-xl bg-sky-500 text-white font-semibold text-center hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/20 mb-3"
                    >
                      Request to Rent
                    </Link>
                    <Link
                      href="/contact"
                      className="block w-full py-3 rounded-xl bg-white text-slate-700 font-medium text-center border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Contact Us
                    </Link>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-xs text-slate-400 text-center">
                      Sign in to request rental dates with instant pricing
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
    </div>
  );
}

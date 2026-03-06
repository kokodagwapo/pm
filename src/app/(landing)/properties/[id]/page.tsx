"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Bed, Bath, MapPin, ArrowLeft, X, Maximize2, CheckCircle, Users } from "lucide-react";

const TABS = ["Description", "Price Details", "Amenities", "Availability", "Reviews", "Map"] as const;

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
  const toNightly = (r: number) => (r > 500 ? Math.round(r / 30) : r);
  if (min === max) return formatPrice(toNightly(min));
  return `${formatPrice(toNightly(min))} - ${formatPrice(toNightly(max))}`;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Description");

  useEffect(() => {
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
  }, [id]);

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

  const fullAddress = property?.address
    ? `${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zipCode}`
    : "";

  useEffect(() => {
    if (fullAddress && fullAddress.trim().length > 5) geocodeAddress(fullAddress);
  }, [fullAddress, geocodeAddress]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapModalOpen(false);
    };
    if (mapModalOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mapModalOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f6]" suppressHydrationWarning>
        <LandingHeader />
        <main className="pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="animate-pulse h-5 w-28 bg-[#e2e8f0] rounded mb-6" />
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0 space-y-6">
                <div className="aspect-[16/10] rounded-xl bg-[#e2e8f0]" />
                <div className="h-8 w-48 bg-[#e2e8f0] rounded" />
                <div className="flex gap-4 border-b border-[#e2e8f0] pb-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-8 w-20 bg-[#e2e8f0] rounded" />
                  ))}
                </div>
                <div className="h-32 bg-[#e2e8f0]/60 rounded-xl" />
              </div>
              <aside className="lg:w-96 shrink-0">
                <div className="sticky top-28 rounded-xl p-6 bg-white border border-[#e2e8f0] shadow-sm space-y-4">
                  <div className="h-8 w-24 bg-[#e2e8f0] rounded" />
                  <div className="h-12 w-full bg-[#e2e8f0] rounded-lg" />
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="min-h-screen bg-[#f5f7f6]" suppressHydrationWarning>
        <LandingHeader />
        <main className="pt-20 pb-16 flex flex-col items-center justify-center min-h-[60vh] px-4">
          <p className="text-[#718096] mb-4">
            {error === "not_found" ? "Property not found." : "Unable to load property. Please try again."}
          </p>
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-[#2d3748] font-medium hover:text-[#6cbeb8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rentals
          </Link>
        </main>
      </div>
    );
  }

  const unit = property.units?.[0];
  const images = property.images?.length
    ? property.images
    : [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
      ];
  const address = property.address;
  const propertyType = property.type ? String(property.type).charAt(0).toUpperCase() + String(property.type).slice(1) : null;
  const status = property.status;

  const lat = mapCoords?.lat ?? 26.142;
  const lon = mapCoords?.lon ?? -81.7948;
  const bbox = `${lon - 0.02},${lat - 0.02},${lon + 0.02},${lat + 0.02}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  const guestsCount = unit ? Math.ceil((unit.bedrooms || 2) * 2) : 6;

  return (
    <div className="min-h-screen bg-[#f5f7f6]" suppressHydrationWarning>
      <LandingHeader />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-[#718096] hover:text-[#6cbeb8] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Your search results
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content - VMS layout */}
            <div className="flex-1 min-w-0">
              {/* Gallery with See all X photos - VMS style */}
              <div className="relative aspect-[16/10] overflow-hidden mb-6 rounded-xl bg-[#e2e8f0] border border-[#e2e8f0] shadow-sm">
                {imageLoading && (
                  <div className="absolute inset-0 bg-[#e2e8f0] animate-pulse" />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[galleryIndex]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
                {images.length > 1 && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => {
                            setGalleryIndex(i);
                            setImageLoading(true);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            i === galleryIndex ? "bg-[#6cbeb8] w-6" : "bg-white/80 w-2"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#6cbeb8]/90 text-white text-sm font-medium shadow-sm">
                  <CheckCircle className="w-4 h-4" />
                  verified
                </div>
                {images.length > 1 && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-md bg-white/95 text-[#4a5568] text-sm font-medium shadow-sm">
                    See all {images.length} photos
                  </div>
                )}
              </div>

              {/* Tab navigation - VMS style */}
              <div className="rounded-xl bg-white border border-[#e2e8f0] shadow-sm overflow-hidden">
              <nav className="flex flex-wrap gap-1 border-b border-[#e2e8f0] px-4">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "text-[#2d3748] border-b-2 border-[#6cbeb8] -mb-px"
                        : "text-[#718096] hover:text-[#2d3748]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {/* Content by tab */}
              <div className="bg-white px-4 pb-6">
                {activeTab === "Description" && (
                  <>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                      {property.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-slate-600">
                      <span>Vacation Home</span>
                      <span>|</span>
                      {propertyType && <span>{propertyType}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {guestsCount} Guests
                      </span>
                      <span>|</span>
                      {unit && (
                        <span>{unit.bedrooms} Bedrooms</span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">
                      Property Description
                    </h2>
                    {property.description ? (
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {property.description}
                      </p>
                    ) : (
                      <p className="text-slate-600">No description available.</p>
                    )}
                  </>
                )}

                {activeTab === "Price Details" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Property Price</h2>
                    <div className="space-y-2">
                      <p className="text-slate-700">
                        Price per night: {getRentDisplay(property)}
                      </p>
                      <p className="text-slate-900 font-medium">
                        Cleaning Fee: USD 170 Single Fee
                      </p>
                      <p className="text-slate-900 font-medium">
                        Minimum no of nights: 14
                      </p>
                      <p className="text-slate-900 font-medium">
                        Security deposit: USD 500
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "Amenities" && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Property Features</h2>
                    {property.amenities?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {property.amenities.map((a: any, i: number) => (
                          <span
                            key={i}
                            className="flex items-center gap-2 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {a.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600">No amenities listed.</p>
                    )}
                  </div>
                )}

                {activeTab === "Availability" && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Availability</h2>
                    <p className="text-slate-600 mb-4">
                      {property.status === "available" ? "This property is available for booking." : "Contact us for availability."}
                    </p>
                    <Link
                      href="/contact"
                      className="inline-flex px-6 py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                    >
                      Contact for availability
                    </Link>
                  </div>
                )}

                {activeTab === "Reviews" && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Reviews</h2>
                    <p className="text-slate-600">No reviews yet.</p>
                  </div>
                )}

                {activeTab === "Map" && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">On the Map</h2>
                    <button
                      type="button"
                      onClick={() => setMapModalOpen(true)}
                      className="w-full text-left overflow-hidden border border-slate-200 rounded-lg hover:ring-2 hover:ring-slate-300 transition-all group"
                    >
                      <div className="relative">
                        <iframe
                          title="Property location"
                          width="100%"
                          height="300"
                          style={{ border: 0, pointerEvents: "none" }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={mapSrc}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg text-slate-700 text-sm font-medium">
                            <Maximize2 className="w-4 h-4" />
                            View location
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0" />
                          {fullAddress || "Property location"}
                        </span>
                        <span className="text-xs text-slate-500">Click to expand</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Property Address & Details - VMS style */}
              <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Property Address</h3>
                  <p className="text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                    {fullAddress || "Address not available"}
                  </p>
                  {address && (
                    <div className="mt-2 text-sm text-slate-600 space-y-1">
                      <p>City: {address.city}</p>
                      <p>Area: {address.street || address.city}</p>
                      <p>State: {address.state}</p>
                      <p>Zip: {address.zipCode}</p>
                    </div>
                  )}
                </div>
                {unit && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Property Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block">Property Status</span>
                        <span className="text-slate-900 font-medium">verified</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Property Size</span>
                        <span className="text-slate-900 font-medium">{unit.squareFootage || "—"} ft²</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bedrooms</span>
                        <span className="text-slate-900 font-medium">{unit.bedrooms}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Bathrooms</span>
                        <span className="text-slate-900 font-medium">{unit.bathrooms}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Check-in</span>
                        <span className="text-slate-900 font-medium">3:00pm</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Check-out</span>
                        <span className="text-slate-900 font-medium">11:00am</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Sticky Book Now widget - VMS style */}
            <aside className="lg:w-96 shrink-0">
              <div className="sticky top-28 rounded-lg p-6 bg-white border border-slate-200 shadow-md">
                <div className="mb-4">
                  <span className="text-2xl font-semibold text-slate-900">
                    {getRentDisplay(property)}
                  </span>
                  {getRentDisplay(property) !== "Contact for pricing" && (
                    <span className="text-slate-600"> per night</span>
                  )}
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Guests</span>
                    <span className="text-slate-900 font-medium">Adults</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Guests</span>
                    <span className="text-slate-900 font-medium">Children</span>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="block w-full py-4 rounded-lg bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition-all"
                >
                  Book Now
                </Link>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                    Add to Favorites
                  </button>
                  <Link
                    href="/contact"
                    className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 text-center"
                  >
                    Contact Owner
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Fullscreen Map & Details Modal - light theme */}
      {mapModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Property location and details"
        >
          <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900 truncate pr-4">
                {property.name} – Location & Details
              </h2>
              <button
                type="button"
                onClick={() => setMapModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="relative h-[50vh] lg:h-[calc(100vh-60px)] min-h-[300px]">
                  <iframe
                    title="Property location - fullscreen"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    src={mapSrc}
                  />
                  <a
                    href={osmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-white shadow-md text-sm text-slate-700 hover:bg-slate-50 border border-slate-200"
                  >
                    Open in OpenStreetMap ↗
                  </a>
                </div>

                <div className="p-6 lg:p-8 overflow-y-auto bg-slate-50">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Address</h3>
                      <p className="text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
                        {fullAddress || "Address not available"}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Pricing</h3>
                      <p className="text-2xl font-semibold text-slate-900">
                        {getRentDisplay(property)}
                        {getRentDisplay(property) !== "Contact for pricing" && (
                          <span className="text-base font-normal text-slate-600">/night</span>
                        )}
                      </p>
                    </div>

                    {unit && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Details</h3>
                        <div className="flex flex-wrap gap-4">
                          <span className="flex items-center gap-2 text-slate-700">
                            <Bed className="w-5 h-5 text-slate-500" />
                            {unit.bedrooms} Bedrooms
                          </span>
                          <span className="flex items-center gap-2 text-slate-700">
                            <Bath className="w-5 h-5 text-slate-500" />
                            {unit.bathrooms} Bathrooms
                          </span>
                          {unit.squareFootage && (
                            <span className="text-slate-700">{unit.squareFootage} sq ft</span>
                          )}
                        </div>
                      </div>
                    )}

                    {property.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">About</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                          {property.description}
                        </p>
                      </div>
                    )}

                    {property.amenities?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((a: any, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href="/contact"
                      className="inline-flex w-full justify-center py-4 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

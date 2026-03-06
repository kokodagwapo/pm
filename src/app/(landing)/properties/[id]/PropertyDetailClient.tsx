"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Bed, Bath, MapPin, ArrowLeft, X, Maximize2 } from "lucide-react";

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
  const [imageLoading, setImageLoading] = useState(true);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);

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

  const unit = property?.units?.[0];
  const address = property?.address;
  const fullAddress = address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
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
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="animate-pulse h-5 w-28 bg-slate-200 rounded mb-6" />
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0 space-y-6">
                <div className="aspect-[16/10] rounded-2xl bg-slate-200" />
                <div className="h-10 w-3/4 bg-slate-200 rounded" />
                <div className="h-5 w-1/2 bg-slate-200 rounded" />
                <div className="flex gap-6">
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                </div>
              </div>
              <aside className="lg:w-96 shrink-0">
                <div className="sticky top-28 rounded-2xl p-6 bg-slate-100 border border-slate-200 space-y-4">
                  <div className="h-8 w-24 bg-slate-200 rounded" />
                  <div className="h-12 w-full bg-slate-200 rounded-xl" />
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
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="pt-20 pb-16 flex flex-col items-center justify-center min-h-[60vh] px-4">
          <p className="text-slate-600 mb-4">
            {error === "not_found"
              ? "Property not found."
              : "Unable to load property. Please try again."}
          </p>
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-slate-900 font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rentals
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rentals
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-8 border border-slate-200 shadow-sm bg-slate-100">
                {imageLoading && (
                  <div className="absolute inset-0 bg-slate-200 animate-pulse" />
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
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          setGalleryIndex(i);
                          setImageLoading(true);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === galleryIndex ? "bg-slate-900 w-6" : "bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                {propertyType && (
                  <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-sm font-medium">
                    {propertyType}
                  </span>
                )}
                {status && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      status === "AVAILABLE"
                        ? "bg-green-100 text-green-800"
                        : status === "OCCUPIED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {String(status).charAt(0) + String(status).slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              <h1 className="font-[var(--font-playfair)] text-3xl md:text-4xl text-slate-900 mb-4">
                {property.name}
              </h1>

              {address && (
                <p className="flex items-center gap-2 text-slate-600 mb-6">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {fullAddress}
                </p>
              )}

              {unit && (
                <div className="flex gap-6 mb-6">
                  <span className="flex items-center gap-2 text-slate-700">
                    <Bed className="w-5 h-5" />
                    {unit.bedrooms} Bedrooms
                  </span>
                  <span className="flex items-center gap-2 text-slate-700">
                    <Bath className="w-5 h-5" />
                    {unit.bathrooms} Bathrooms
                  </span>
                  {unit.squareFootage && (
                    <span className="text-slate-700">{unit.squareFootage} sq ft</span>
                  )}
                </div>
              )}

              {property.description && (
                <div className="rounded-2xl p-6 mb-8 bg-white border border-slate-200 shadow-sm">
                  <h2 className="font-[var(--font-playfair)] text-xl text-slate-900 mb-3">
                    About this property
                  </h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}

              {property.amenities?.length > 0 && (
                <div className="rounded-2xl p-6 mb-8 bg-white border border-slate-200 shadow-sm">
                  <h2 className="font-[var(--font-playfair)] text-xl text-slate-900 mb-3">
                    Amenities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((a: any, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMapModalOpen(true)}
                className="w-full text-left rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-slate-300 hover:ring-offset-2 transition-all group"
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
                      View location & details
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

            <aside className="lg:w-96 shrink-0">
              <div className="sticky top-28 rounded-2xl p-6 bg-white border border-slate-200 shadow-lg">
                <div className="mb-4">
                  <span className="text-2xl font-semibold text-slate-900">
                    {getRentDisplay(property)}
                  </span>
                  {getRentDisplay(property) !== "Contact for pricing" && (
                    <span className="text-slate-600">/month</span>
                  )}
                </div>
                <Link
                  href="/contact"
                  className="block w-full py-4 rounded-xl bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition-all"
                >
                  Book Now
                </Link>
                <p className="text-slate-500 text-sm mt-4 text-center">
                  Or contact us for custom stays
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {mapModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Property location and details"
        >
          <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
              <h2 className="font-[var(--font-playfair)] text-lg font-semibold text-slate-900 truncate pr-4">
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
                    className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-white shadow-md text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Open in OpenStreetMap ↗
                  </a>
                </div>

                <div className="p-6 lg:p-8 overflow-y-auto bg-slate-50">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Address
                      </h3>
                      <p className="text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {fullAddress || "Address not available"}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Pricing
                      </h3>
                      <p className="text-2xl font-semibold text-slate-900">
                        {getRentDisplay(property)}
                        {getRentDisplay(property) !== "Contact for pricing" && (
                          <span className="text-base font-normal text-slate-600">/month</span>
                        )}
                      </p>
                    </div>

                    {unit && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Details
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          <span className="flex items-center gap-2 text-slate-700">
                            <Bed className="w-5 h-5" />
                            {unit.bedrooms} Bedrooms
                          </span>
                          <span className="flex items-center gap-2 text-slate-700">
                            <Bath className="w-5 h-5" />
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
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          About
                        </h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                          {property.description}
                        </p>
                      </div>
                    )}

                    {property.amenities?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Amenities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((a: any, i: number) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-sm"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href="/contact"
                      className="inline-flex w-full justify-center py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all"
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

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Bed, Bath, MapPin, ArrowLeft } from "lucide-react";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/properties/public/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) setProperty(data.data);
      })
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <p className="text-white/70">Property not found</p>
        <Link href="/rentals" className="text-white underline">
          Back to Rentals
        </Link>
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
  const fullAddress = address
    ? `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
    : "";
  const mapQuery = encodeURIComponent(fullAddress || "Naples, FL");

  return (
    <div className="min-h-screen bg-slate-900">
      <LandingHeader />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Link
            href="/rentals"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rentals
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Gallery */}
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[galleryIndex]}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setGalleryIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === galleryIndex ? "bg-white w-6" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <h1
                className="font-[var(--font-playfair)] text-3xl md:text-4xl text-white mb-4"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
              >
                {property.name}
              </h1>

              {address && (
                <p className="flex items-center gap-2 text-white/70 mb-6">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {fullAddress}
                </p>
              )}

              {unit && (
                <div className="flex gap-6 mb-6">
                  <span className="flex items-center gap-2 text-white/80">
                    <Bed className="w-5 h-5" />
                    {unit.bedrooms} Bedrooms
                  </span>
                  <span className="flex items-center gap-2 text-white/80">
                    <Bath className="w-5 h-5" />
                    {unit.bathrooms} Bathrooms
                  </span>
                  {unit.squareFootage && (
                    <span className="text-white/80">
                      {unit.squareFootage} sq ft
                    </span>
                  )}
                </div>
              )}

              {property.description && (
                <div
                  className="rounded-2xl p-6 mb-8"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <h2 className="font-[var(--font-playfair)] text-xl text-white mb-3">
                    About this property
                  </h2>
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}

              {property.amenities?.length > 0 && (
                <div
                  className="rounded-2xl p-6 mb-8"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <h2 className="font-[var(--font-playfair)] text-xl text-white mb-3">
                    Amenities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((a: any, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {fullAddress && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <iframe
                    title="Property location"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=-82.0%2C26.0%2C-81.5%2C26.3&layer=mapnik&marker=26.1420,-81.7948`}
                  />
                </div>
              )}
            </div>

            {/* Sticky Book Now widget */}
            <aside className="lg:w-96 shrink-0">
              <div
                className="sticky top-28 rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
              >
                <div className="mb-4">
                  <span className="text-2xl font-semibold text-white">
                    {unit?.rentAmount
                      ? formatPrice(unit.rentAmount > 500 ? unit.rentAmount : unit.rentAmount * 30)
                      : "Contact for pricing"}
                  </span>
                  <span className="text-white/70">/month</span>
                </div>
                <Link
                  href="/contact"
                  className="block w-full py-4 rounded-xl bg-white text-[var(--landing-navy)] font-semibold text-center hover:bg-white/95 transition-all"
                >
                  Book Now
                </Link>
                <p className="text-white/60 text-sm mt-4 text-center">
                  Or contact us for custom stays
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

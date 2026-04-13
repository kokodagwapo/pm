"use client";

interface SinglePropertyMapProps {
  lat: number;
  lon: number;
  address?: string;
  propertyName?: string;
}

export function SinglePropertyMap({ lat, lon, address, propertyName }: SinglePropertyMapProps) {
  const title = propertyName
    ? address
      ? `${propertyName} — ${address}`
      : propertyName
    : address || "Property location";
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lon}`
  )}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    `${lat},${lon}`
  )}&z=15&output=embed`;

  return (
    <div className="relative h-full w-full">
      <iframe
        title={title}
        src={embedUrl}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
      >
        Open in Google Maps
      </a>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Satellite, Shield, Eye } from "lucide-react";
import { getGoogleMapsBrowserKey, hasGoogleMapsBrowserKey } from "@/lib/google-maps";

type TileMode = "roadmap" | "satellite" | "terrain" | "streetview";

interface Property {
  _id: string;
  name: string;
  address?: { city?: string; state?: string; street?: string; zipCode?: string };
  units?: Array<{ rentAmount?: number; bedrooms?: number; bathrooms?: number }>;
  images?: string[];
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number];
  location?: { coordinates?: [number, number] };
}

interface RentalsGoogleMapProps {
  properties: Property[];
  onMarkerClick?: (propertyId: string) => void;
  onMarkerHover?: (propertyId: string | null) => void;
  hoveredPropertyId?: string | null;
  neighborhoods?: { label: string; value: string }[];
  activeNeighborhood?: string;
  onNeighborhoodChange?: (value: string) => void;
}

const NAPLES_CENTER = { lat: 26.1700, lng: -81.7800 };

function getCoords(property: Property): { lat: number; lng: number } {
  if (typeof property.latitude === "number" && typeof property.longitude === "number") {
    return { lat: property.latitude, lng: property.longitude };
  }
  if (Array.isArray(property.location?.coordinates) && property.location.coordinates.length === 2) {
    const [lng, lat] = property.location.coordinates;
    return { lat, lng };
  }
  if (Array.isArray(property.coordinates) && property.coordinates.length === 2) {
    const [lng, lat] = property.coordinates;
    return { lat, lng };
  }
  return NAPLES_CENTER;
}

function formatPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

export function RentalsGoogleMap({
  properties,
  onMarkerClick,
  onMarkerHover,
  hoveredPropertyId,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
}: RentalsGoogleMapProps) {
  const key = getGoogleMapsBrowserKey();
  const mapRef = useRef<google.maps.Map | null>(null);
  const streetViewRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [mode, setMode] = useState<TileMode>("roadmap");
  const [loaded, setLoaded] = useState(false);

  const markers = useMemo(
    () => properties.map((property) => ({ property, position: getCoords(property) })),
    [properties]
  );

  const loadGoogleMaps = useCallback(() => {
    if (!key || typeof window === "undefined" || (window as any).google?.maps) {
      setLoaded(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-rentals-google-maps="1"]');
    if (existing) return;
    const script = document.createElement("script");
    script.dataset.rentalsGoogleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.onload = () => setLoaded(true);
    script.onerror = () => setLoaded(false);
    document.head.appendChild(script);
  }, [key]);

  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined" || !(window as any).google?.maps) return;
    const g = (window as any).google.maps;
    const map = mapRef.current;
    if (!map) return;
    if (mode === "streetview") {
      const panorama = streetViewRef.current ?? new g.StreetViewPanorama(map.getDiv(), {});
      streetViewRef.current = panorama;
      map.setStreetView(panorama);
      panorama.setPosition(map.getCenter() ?? NAPLES_CENTER);
      panorama.setVisible(true);
      return;
    }
    map.getStreetView().setVisible(false);
    map.setMapTypeId(mode === "terrain" ? "terrain" : mode === "satellite" ? "hybrid" : "roadmap");
  }, [mode, loaded]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(({ position }) => bounds.extend(position));
    if (markers.length === 1) {
      map.setCenter(markers[0].position);
      map.setZoom(14);
    } else if (markers.length > 1) {
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(NAPLES_CENTER);
      map.setZoom(12);
    }
  }, [markers]);

  const openStreetView = useCallback(() => setMode("streetview"), []);

  if (!hasGoogleMapsBrowserKey()) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2 rounded-2xl border border-white/50 bg-white/90 p-2 shadow-lg backdrop-blur">
        <button onClick={() => setMode("roadmap")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${mode === "roadmap" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}><Map className="mr-1 inline h-3.5 w-3.5" />Map</button>
        <button onClick={() => setMode("satellite")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${mode === "satellite" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}><Satellite className="mr-1 inline h-3.5 w-3.5" />Satellite</button>
        <button onClick={() => setMode("terrain")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${mode === "terrain" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}><Shield className="mr-1 inline h-3.5 w-3.5" />3D</button>
        <button onClick={openStreetView} className={`rounded-full px-3 py-1.5 text-xs font-medium ${mode === "streetview" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}><Eye className="mr-1 inline h-3.5 w-3.5" />Street View</button>
      </div>
      {neighborhoods?.length ? (
        <div className="absolute right-3 top-3 z-20 rounded-2xl border border-white/50 bg-white/90 p-2 shadow-lg backdrop-blur">
          <select
            value={activeNeighborhood ?? ""}
            onChange={(e) => onNeighborhoodChange?.(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            {neighborhoods.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
      ) : null}
      <div className="h-full w-full rounded-none">
        {loaded ? (
          <div ref={(node) => {
            if (!node || !key) return;
            const google = (window as any).google;
            if (!google?.maps) return;
            if (!mapRef.current) {
              mapRef.current = new google.maps.Map(node, {
                center: NAPLES_CENTER,
                zoom: 12,
                mapTypeId: "roadmap",
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              });
              mapRef.current.addListener("idle", () => {
                if (mode !== "streetview") streetViewRef.current?.setVisible(false);
              });
            }
          }} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white text-slate-500">Loading map…</div>
        )}
      </div>
      {markers.map(({ property, position }) => (
        <button
          key={property._id}
          type="button"
          onClick={() => onMarkerClick?.(property._id)}
          onMouseEnter={() => onMarkerHover?.(property._id)}
          onMouseLeave={() => onMarkerHover?.(null)}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-md backdrop-blur ${
            hoveredPropertyId === property._id ? "border-sky-400 bg-sky-500 text-white" : "border-white/70 bg-white/90 text-slate-800"
          }`}
          style={{ left: `${50 + (position.lng - NAPLES_CENTER.lng) * 8}%`, top: `${50 - (position.lat - NAPLES_CENTER.lat) * 8}%` }}
        >
          {formatPrice(property.units?.[0]?.rentAmount ?? 0)}
        </button>
      ))}
    </div>
  );
}
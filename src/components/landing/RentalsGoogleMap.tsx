"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { ArrowUpRight, BedDouble, Map, MapPin, Mountain, Satellite, Waves } from "lucide-react";
import {
  getGoogleMapsBrowserKey,
  hasGoogleMapsBrowserKey,
} from "@/lib/google-maps";

type TileMode = "roadmap" | "satellite" | "terrain";

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

const NAPLES_CENTER = { lat: 26.17, lng: -81.78 };
const mapContainerStyle = { width: "100%", height: "100%" };

function getCoords(p: Property): { lat: number; lng: number } {
  if (typeof p.latitude === "number" && typeof p.longitude === "number")
    return { lat: p.latitude, lng: p.longitude };
  if (Array.isArray(p.location?.coordinates) && p.location!.coordinates.length === 2) {
    const [lng, lat] = p.location!.coordinates;
    return { lat, lng };
  }
  if (Array.isArray(p.coordinates) && p.coordinates.length === 2) {
    const [lng, lat] = p.coordinates;
    return { lat, lng };
  }
  return NAPLES_CENTER;
}

function fmtPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

function getPrimaryImage(property: Property): string | null {
  return property.images?.[0] || null;
}

function getPropertyPrice(property: Property): number {
  const rent = property.units?.[0]?.rentAmount ?? 0;
  return rent > 500 ? rent : rent * 30;
}

function getPropertySpecs(property: Property) {
  const unit = property.units?.[0];
  return {
    bedrooms: unit?.bedrooms ?? 0,
    bathrooms: unit?.bathrooms ?? 0,
  };
}

function RentalsMapToolbar({
  mode,
  setMode,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
}: {
  mode: TileMode;
  setMode: (mode: TileMode) => void;
  neighborhoods?: { label: string; value: string }[];
  activeNeighborhood?: string;
  onNeighborhoodChange?: (value: string) => void;
}) {
  return (
    <>
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5 rounded-xl border border-white/60 bg-white/90 p-1.5 shadow-lg backdrop-blur-sm">
        {(
          [
            { id: "roadmap", label: "Map", Icon: Map },
            { id: "satellite", label: "Satellite", Icon: Satellite },
          ] as { id: TileMode; label: string; Icon: typeof Map }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {neighborhoods && neighborhoods.length > 0 && (
        <div className="absolute right-3 top-3 z-20">
          <select
            value={activeNeighborhood ?? ""}
            onChange={(e) => onNeighborhoodChange?.(e.target.value)}
            className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur-sm"
          >
            {neighborhoods.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

function PropertyHoverPreview({
  property,
}: {
  property: Property;
}) {
  const price = getPropertyPrice(property);
  const imageUrl = getPrimaryImage(property);
  const { bedrooms, bathrooms } = getPropertySpecs(property);

  return (
    <a
      href={`/properties/${property._id}`}
      className="block w-[250px] overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:scale-[1.01]"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={property.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Map className="h-8 w-8 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
          Preview
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-bold tracking-tight text-white">{fmtPrice(price)}</p>
            <p className="text-[11px] text-white/80">Click to view property</p>
          </div>
          <div className="rounded-full bg-white/16 p-2 text-white backdrop-blur-sm">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="space-y-2 p-3.5">
        {property.neighborhood && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600">
            {property.neighborhood}
          </p>
        )}
        <h4 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-slate-900">
          {property.name}
        </h4>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5 text-slate-400" />
            {bedrooms} bd
          </span>
          <span>{bathrooms} ba</span>
          {(property.address?.city || property.address?.state) && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {property.address?.city}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function MapPlaceholder({ message }: { message: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <Map className="h-10 w-10 text-slate-300" />
        <p className="max-w-xs text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export function RentalsGoogleMap(props: RentalsGoogleMapProps) {
  const apiKey = getGoogleMapsBrowserKey();
  
  useEffect(() => {
    if (apiKey) {
      console.log(`[GoogleMap] Initializing with key: ${apiKey.substring(0, 8)}...`);
    } else {
      console.warn("[GoogleMap] No API key found in environment");
    }
  }, [apiKey]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<TileMode>("roadmap");
  const [authFailed, setAuthFailed] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "rentals-google-maps",
    googleMapsApiKey: apiKey,
    version: "weekly",
  });

  const markers = useMemo(
    () => props.properties.map((property) => ({ property, position: getCoords(property) })),
    [props.properties]
  );
  const hoveredMarker = useMemo(
    () => markers.find(({ property }) => property._id === props.hoveredPropertyId) ?? null,
    [markers, props.hoveredPropertyId]
  );

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleMarkerHover = useCallback((propertyId: string) => {
    clearHoverTimeout();
    props.onMarkerHover?.(propertyId);
  }, [clearHoverTimeout, props]);

  const handleMarkerLeave = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      props.onMarkerHover?.(null);
    }, 140);
  }, [clearHoverTimeout, props]);

  const fitMapToMarkers = useCallback((map: google.maps.Map) => {
    if (markers.length === 0) {
      map.setCenter(NAPLES_CENTER);
      map.setZoom(12);
    } else if (markers.length === 1) {
      map.setCenter(markers[0].position);
      map.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(({ position }) => bounds.extend(position));
      map.fitBounds(bounds, 48);
    }
  }, [markers]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitMapToMarkers(map);
  }, [fitMapToMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) return;
    fitMapToMarkers(map);
  }, [markers, isLoaded, fitMapToMarkers]);

  useEffect(() => {
    if (!isLoaded) return;
    const map = mapRef.current;
    if (!map) return;
    map.setMapTypeId(
      mode === "terrain" ? "terrain" : mode === "satellite" ? "hybrid" : "roadmap"
    );
  }, [mode, isLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setAuthFailed(true);
    (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure = handler;
    return () => {
      delete (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure;
    };
  }, []);

  useEffect(() => {
    return () => clearHoverTimeout();
  }, [clearHoverTimeout]);

  if (!hasGoogleMapsBrowserKey()) {
    return <MapPlaceholder message="Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment." />;
  }

  if (loadError) {
    return <MapPlaceholder message="Unable to load Google Maps. Please check your API key configuration and try again." />;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-slate-100 ring-1 ring-slate-200/70 shadow-[0_32px_100px_rgba(15,23,42,0.1)]">
      <style jsx global>{`
        .gm-style .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 1.35rem !important;
          box-shadow: none !important;
        }
        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
        }
        .gm-style .gm-style-iw-tc::after {
          background: white !important;
        }
        .gm-style button[aria-label="Close"] {
          top: 8px !important;
          right: 8px !important;
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/35 via-white/10 to-transparent" />
      <RentalsMapToolbar
        mode={mode}
        setMode={setMode}
        neighborhoods={props.neighborhoods}
        activeNeighborhood={props.activeNeighborhood}
        onNeighborhoodChange={props.onNeighborhoodChange}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-lg backdrop-blur-sm md:flex md:items-center md:gap-2">
        <Waves className="h-3.5 w-3.5 text-sky-500" />
        Hover a price pin to preview the home
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={NAPLES_CENTER}
        zoom={12}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          mapTypeId: "roadmap",
        }}
      >
        {markers.map(({ property, position }) => {
          const price = getPropertyPrice(property);
          const active = props.hoveredPropertyId === property._id;
          return (
            <MarkerF
              key={property._id}
              position={position}
              onClick={() => props.onMarkerClick?.(property._id)}
              onMouseOver={() => handleMarkerHover(property._id)}
              onMouseOut={handleMarkerLeave}
              label={{
                text: fmtPrice(price),
                color: active ? "#ffffff" : "#0f172a",
                fontSize: "11px",
                fontWeight: "600",
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: active ? 10.5 : 8.5,
                fillColor: active ? "#0f172a" : "#ffffff",
                fillOpacity: 0.96,
                strokeColor: active ? "#38bdf8" : "#cbd5e1",
                strokeWeight: 2,
              }}
            />
          );
        })}
        {hoveredMarker && (
          <InfoWindowF
            position={hoveredMarker.position}
            options={{
              pixelOffset: new google.maps.Size(0, -18),
              disableAutoPan: false,
              headerDisabled: true,
            }}
            onCloseClick={() => props.onMarkerHover?.(null)}
          >
            <div
              onMouseEnter={() => handleMarkerHover(hoveredMarker.property._id)}
              onMouseLeave={handleMarkerLeave}
            >
              <PropertyHoverPreview property={hoveredMarker.property} />
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {authFailed && (
        <div className="absolute bottom-3 left-3 z-20 max-w-sm rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
          Google Maps API key is restricted for this domain. The map may not display correctly.
        </div>
      )}
    </div>
  );
}

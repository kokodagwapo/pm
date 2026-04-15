"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { Eye, Map, Mountain, Satellite } from "lucide-react";
import {
  getGoogleMapsBrowserKey,
  hasGoogleMapsBrowserKey,
} from "@/lib/google-maps";

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

function RentalsMapToolbar({
  mode,
  setMode,
  onStreetView,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
}: {
  mode: TileMode;
  setMode: (mode: TileMode) => void;
  onStreetView: () => void;
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
            { id: "terrain", label: "3D", Icon: Mountain },
            { id: "streetview", label: "Street View", Icon: Eye },
          ] as { id: TileMode; label: string; Icon: typeof Eye }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "streetview") {
                onStreetView();
                return;
              }
              setMode(id);
            }}
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
  const mapRef = useRef<google.maps.Map | null>(null);
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
    const pano = map.getStreetView();
    if (mode === "streetview") {
      pano.setPosition(map.getCenter() ?? NAPLES_CENTER);
      pano.setPov({ heading: 0, pitch: 0 });
      pano.setVisible(true);
      return;
    }
    pano.setVisible(false);
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
    <div className="relative h-full w-full">
      <RentalsMapToolbar
        mode={mode}
        setMode={setMode}
        onStreetView={() => setMode("streetview")}
        neighborhoods={props.neighborhoods}
        activeNeighborhood={props.activeNeighborhood}
        onNeighborhoodChange={props.onNeighborhoodChange}
      />
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
          const rent = property.units?.[0]?.rentAmount ?? 0;
          const price = rent > 500 ? rent : rent * 30;
          const active = props.hoveredPropertyId === property._id;
          return (
            <MarkerF
              key={property._id}
              position={position}
              onClick={() => props.onMarkerClick?.(property._id)}
              onMouseOver={() => props.onMarkerHover?.(property._id)}
              onMouseOut={() => props.onMarkerHover?.(null)}
              label={{
                text: fmtPrice(price),
                color: active ? "#ffffff" : "#0f172a",
                fontSize: "11px",
                fontWeight: "600",
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: active ? 10 : 8,
                fillColor: active ? "#0f172a" : "#ffffff",
                fillOpacity: 0.96,
                strokeColor: active ? "#ffffff" : "#cbd5e1",
                strokeWeight: 2,
              }}
            />
          );
        })}
      </GoogleMap>

      {authFailed && (
        <div className="absolute bottom-3 left-3 z-20 max-w-sm rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
          Google Maps API key is restricted for this domain. The map may not display correctly.
        </div>
      )}
    </div>
  );
}

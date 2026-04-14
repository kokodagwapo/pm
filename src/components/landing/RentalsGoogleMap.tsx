"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { Eye, Map, Mountain, Satellite } from "lucide-react";
import {
  getGoogleMapsBrowserKey,
  hasGoogleMapsBrowserKey,
} from "@/lib/google-maps";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;
type LeafletTileLayer = import("leaflet").TileLayer;

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
const LEAFLET_CSS_ID = "rentals-leaflet-css";
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

function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement("link");
  link.id = LEAFLET_CSS_ID;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

function markerHtml(text: string, active: boolean): string {
  return `
    <div style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      white-space:nowrap;
      border-radius:999px;
      padding:6px 12px;
      font-size:11px;
      font-weight:600;
      letter-spacing:0.02em;
      color:${active ? "#ffffff" : "#0f172a"};
      background:${active ? "#0f172a" : "rgba(255,255,255,0.96)"};
      border:1.5px solid ${active ? "#0f172a" : "rgba(15,23,42,0.12)"};
      box-shadow:${active ? "0 6px 18px rgba(15,23,42,0.28)" : "0 4px 12px rgba(15,23,42,0.16)"};
      transform:${active ? "scale(1.06)" : "scale(1)"};
      transition:all 0.15s ease;
      backdrop-filter:blur(6px);
      -webkit-backdrop-filter:blur(6px);
    ">${text}</div>
  `;
}

function tileLayerFor(L: LeafletModule, mode: Exclude<TileMode, "streetview">): LeafletTileLayer {
  if (mode === "satellite") {
    return L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        maxZoom: 19,
      }
    );
  }
  if (mode === "terrain") {
    return L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution:
        "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap",
      maxZoom: 17,
    });
  }
  return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  });
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

function RentalsLeafletFallback({
  properties,
  onMarkerClick,
  onMarkerHover,
  hoveredPropertyId,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
  message,
}: RentalsGoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const markersRef = useRef<globalThis.Map<string, LeafletMarker>>(new globalThis.Map());
  const [mode, setMode] = useState<TileMode>("roadmap");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    ensureLeafletCss();
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(containerRef.current, {
          center: [NAPLES_CENTER.lat, NAPLES_CENTER.lng],
          zoom: 12,
          zoomControl: false,
          attributionControl: true,
        });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        tileLayerRef.current = tileLayerFor(L, "roadmap").addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setError("Could not load the map"));
    return () => {
      const tileLayer = tileLayerRef.current;
      const map = mapRef.current;
      cancelled = true;
      markers.forEach((marker) => marker.remove());
      markers.clear();
      tileLayer?.remove();
      tileLayerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;
    if (mode === "streetview") return;
    tileLayerRef.current?.remove();
    tileLayerRef.current = tileLayerFor(L, mode).addTo(map);
  }, [mode, ready]);

  const openStreetView = useCallback(() => {
    const map = mapRef.current;
    const center = map?.getCenter();
    const lat = center?.lat ?? NAPLES_CENTER.lat;
    const lng = center?.lng ?? NAPLES_CENTER.lng;
    window.open(
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (properties.length === 0) {
      map.setView([NAPLES_CENTER.lat, NAPLES_CENTER.lng], 12);
      return;
    }

    const bounds: [number, number][] = [];

    properties.forEach((property) => {
      const pos = getCoords(property);
      bounds.push([pos.lat, pos.lng]);
      const rent = property.units?.[0]?.rentAmount ?? 0;
      const price = rent > 500 ? rent : rent * 30;
      const active = hoveredPropertyId === property._id;
      const marker = L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({
          className: "",
          html: markerHtml(fmtPrice(price), active),
          iconSize: [80, 32],
          iconAnchor: [40, 16],
        }),
      })
        .addTo(map)
        .on("click", () => onMarkerClick?.(property._id))
        .on("mouseover", () => onMarkerHover?.(property._id))
        .on("mouseout", () => onMarkerHover?.(null));

      markersRef.current.set(property._id, marker);
    });

    if (properties.length === 1) {
      const c = getCoords(properties[0]);
      map.setView([c.lat, c.lng], 14);
    } else {
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [properties, ready, onMarkerClick, onMarkerHover, hoveredPropertyId]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <RentalsMapToolbar
        mode={mode}
        setMode={setMode}
        onStreetView={openStreetView}
        neighborhoods={neighborhoods}
        activeNeighborhood={activeNeighborhood}
        onNeighborhoodChange={onNeighborhoodChange}
      />

      <div ref={containerRef} className="h-full w-full" />

      {message ? (
        <div className="absolute bottom-3 left-3 z-20 max-w-sm rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
          {message}
        </div>
      ) : null}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading map…</p>
        </div>
      )}
    </div>
  );
}

function RentalsGooglePrimary(props: RentalsGoogleMapProps) {
  const apiKey = getGoogleMapsBrowserKey();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mode, setMode] = useState<TileMode>("roadmap");
  const [forceFallback, setForceFallback] = useState(false);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "rentals-google-maps",
    googleMapsApiKey: apiKey,
    version: "weekly",
  });

  const markers = useMemo(
    () => props.properties.map((property) => ({ property, position: getCoords(property) })),
    [props.properties]
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
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
    const handler = () => setForceFallback(true);
    (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure = handler;
    return () => {
      delete (window as typeof window & { gm_authFailure?: () => void }).gm_authFailure;
    };
  }, []);

  if (loadError || forceFallback) {
    return (
      <RentalsLeafletFallback
        {...props}
        message="Google Maps is blocked for this local host. Using the local fallback map instead."
      />
    );
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
    </div>
  );
}

export function RentalsGoogleMap(props: RentalsGoogleMapProps) {
  const useLeafletFallback =
    typeof window !== "undefined" &&
    window.location.hostname === "127.0.0.1" &&
    hasGoogleMapsBrowserKey();

  if (!hasGoogleMapsBrowserKey()) {
    return <RentalsLeafletFallback {...props} />;
  }

  if (useLeafletFallback) {
    return (
      <RentalsLeafletFallback
        {...props}
        message="Google Maps is restricted for 127.0.0.1. Open localhost:3000 or whitelist this host in Google Cloud to use Google here."
      />
    );
  }

  return <RentalsGooglePrimary {...props} />;
}

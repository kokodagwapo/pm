"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Satellite, Mountain, Eye } from "lucide-react";
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

const NAPLES_CENTER = { lat: 26.17, lng: -81.78 };

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

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if ((window as any).google?.maps) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gmap-loader="1"]'
    );
    if (existing) {
      if ((window as any).google?.maps) return resolve();
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.dataset.gmapLoader = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

let OverlayClass: any = null;

function getOverlayClass() {
  if (OverlayClass) return OverlayClass;
  const g = (window as any).google;
  if (!g?.maps?.OverlayView) return null;

  OverlayClass = class extends g.maps.OverlayView {
    pos: any;
    div: HTMLDivElement | null = null;
    text: string;
    propId: string;
    onClickCb?: (id: string) => void;
    onEnterCb?: (id: string) => void;
    onLeaveCb?: () => void;

    constructor(
      pos: any,
      text: string,
      propId: string,
      onClick?: (id: string) => void,
      onEnter?: (id: string) => void,
      onLeave?: () => void
    ) {
      super();
      this.pos = pos;
      this.text = text;
      this.propId = propId;
      this.onClickCb = onClick;
      this.onEnterCb = onEnter;
      this.onLeaveCb = onLeave;
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.cssText =
        "position:absolute;cursor:pointer;white-space:nowrap;font-size:11px;font-weight:500;" +
        "padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.92);color:#0f172a;" +
        "border:1.5px solid rgba(15,23,42,0.15);box-shadow:0 2px 8px rgba(0,0,0,0.18);" +
        "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
        "transition:all 0.15s ease;z-index:1;letter-spacing:0.04em;";
      div.textContent = this.text;
      div.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        this.onClickCb?.(this.propId);
      });
      div.addEventListener("mouseenter", () => {
        this._applyHighlight(div, true);
        this.onEnterCb?.(this.propId);
      });
      div.addEventListener("mouseleave", () => {
        this._applyHighlight(div, false);
        this.onLeaveCb?.();
      });
      this.div = div;
      const panes = this.getPanes();
      panes?.overlayMouseTarget?.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const proj = this.getProjection();
      if (!proj) return;
      const point = proj.fromLatLngToDivPixel(this.pos);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
      this.div.style.transform = "translate(-50%, -50%)";
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }

    setHighlighted(on: boolean) {
      if (this.div) this._applyHighlight(this.div, on);
    }

    _applyHighlight(div: HTMLDivElement, on: boolean) {
      if (on) {
        div.style.background = "rgba(255,255,255,0.97)";
        div.style.borderColor = "rgba(99,102,241,0.4)";
        div.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25), 0 0 0 3px rgba(99,102,241,0.2)";
        div.style.transform = "scale(1.12) translate(-50%, -50%)";
        div.style.zIndex = "999";
      } else {
        div.style.background = "rgba(255,255,255,0.92)";
        div.style.borderColor = "rgba(15,23,42,0.15)";
        div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
        div.style.transform = "translate(-50%, -50%)";
        div.style.zIndex = "1";
      }
    }
  };

  return OverlayClass;
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
  const apiKey = getGoogleMapsBrowserKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<globalThis.Map<string, any>>(new globalThis.Map());
  const [mode, setMode] = useState<TileMode>("roadmap");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Google Maps");
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    try {
      const g = (window as any).google;
      mapRef.current = new g.maps.Map(containerRef.current, {
        center: NAPLES_CENTER,
        zoom: 12,
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
    } catch {
      setError("Failed to initialize map");
    }
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    try {
      if (mode === "streetview") {
        const sv = map.getStreetView();
        sv.setPosition(map.getCenter() ?? NAPLES_CENTER);
        sv.setVisible(true);
        return;
      }
      map.getStreetView()?.setVisible(false);
      const typeId =
        mode === "satellite" ? "hybrid" : mode === "terrain" ? "terrain" : "roadmap";
      map.setMapTypeId(typeId);
    } catch {
      // ignore mode switch errors
    }
  }, [mode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    overlaysRef.current.forEach((ov) => {
      try {
        ov.setMap(null);
      } catch {
        // ignore
      }
    });
    overlaysRef.current.clear();

    const g = (window as any).google;
    if (!g?.maps) return;

    if (properties.length === 0) {
      map.setCenter(NAPLES_CENTER);
      map.setZoom(12);
      return;
    }

    const OvClass = getOverlayClass();
    const bounds = new g.maps.LatLngBounds();

    properties.forEach((property) => {
      const pos = getCoords(property);
      const latLng = new g.maps.LatLng(pos.lat, pos.lng);
      bounds.extend(latLng);

      if (OvClass) {
        const rent = property.units?.[0]?.rentAmount ?? 0;
        const price = rent > 500 ? rent : rent * 30;
        const overlay = new OvClass(
          latLng,
          fmtPrice(price),
          property._id,
          onMarkerClick,
          (id: string) => onMarkerHover?.(id),
          () => onMarkerHover?.(null)
        );
        overlay.setMap(map);
        overlaysRef.current.set(property._id, overlay);
      } else {
        const marker = new g.maps.Marker({
          position: latLng,
          map,
          title: property.name,
        });
        marker.addListener("click", () => onMarkerClick?.(property._id));
        overlaysRef.current.set(property._id, marker);
      }
    });

    if (properties.length === 1) {
      const c = getCoords(properties[0]);
      map.setCenter({ lat: c.lat, lng: c.lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [properties, ready, onMarkerClick, onMarkerHover]);

  useEffect(() => {
    overlaysRef.current.forEach((ov, id) => {
      if (typeof ov.setHighlighted === "function") {
        ov.setHighlighted(id === hoveredPropertyId);
      }
    });
  }, [hoveredPropertyId]);

  if (!hasGoogleMapsBrowserKey()) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Add{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to enable the map
        </div>
      </div>
    );
  }

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
      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5 rounded-xl border border-white/60 bg-white/90 p-1.5 shadow-lg backdrop-blur-sm">
        {(
          [
            { id: "roadmap", label: "Map", Icon: Map },
            { id: "satellite", label: "Satellite", Icon: Satellite },
            { id: "terrain", label: "3D", Icon: Mountain },
            { id: "streetview", label: "Street View", Icon: Eye },
          ] as { id: TileMode; label: string; Icon: any }[]
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

      <div ref={containerRef} className="h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading map…</p>
        </div>
      )}
    </div>
  );
}

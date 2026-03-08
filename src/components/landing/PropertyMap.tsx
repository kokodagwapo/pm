"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Satellite, Map as MapIcon, Mountain } from "lucide-react";

const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  "Falling Waters": [26.1030, -81.7510],
  "Winter Park": [26.1780, -81.7960],
  "World Tennis Club": [26.1550, -81.7650],
  "Glen Eagle": [26.1200, -81.7420],
  "Moon Lake": [26.1650, -81.7800],
  "Naples Park": [26.2650, -81.8080],
  "Royal Arms": [26.1500, -81.7900],
  "Villas of Whittenberg": [26.1880, -81.7850],
  "Naples": [26.1420, -81.7948],
};

const NAPLES_CENTER: [number, number] = [26.1700, -81.7800];

interface Property {
  _id: string;
  name: string;
  address?: { city?: string; state?: string; street?: string };
  units?: Array<{
    bedrooms?: number;
    bathrooms?: number;
    rentAmount?: number;
  }>;
  images?: string[];
  neighborhood?: string;
}

interface PropertyMapProps {
  properties: Property[];
  onMarkerClick?: (propertyId: string) => void;
  onMarkerHover?: (propertyId: string | null) => void;
  hoveredPropertyId?: string | null;
}

const coordCacheMap = new Map<string, [number, number]>();

function getPropertyCoords(property: Property): [number, number] {
  if (coordCacheMap.has(property._id)) {
    return coordCacheMap.get(property._id)!;
  }
  const neighborhood = property.neighborhood || property.name;
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (neighborhood.includes(key) || property.name.includes(key)) {
      const jitter = () => (Math.random() - 0.5) * 0.003;
      const result: [number, number] = [coords[0] + jitter(), coords[1] + jitter()];
      coordCacheMap.set(property._id, result);
      return result;
    }
  }
  const jitter = () => (Math.random() - 0.5) * 0.01;
  const result: [number, number] = [NAPLES_CENTER[0] + jitter(), NAPLES_CENTER[1] + jitter()];
  coordCacheMap.set(property._id, result);
  return result;
}

function formatPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

type TileMode = "satellite" | "modern" | "terrain";

const TILE_LAYERS: Record<TileMode, {
  base: string;
  labels?: string;
  attribution: string;
  subdomains?: string;
  pillDark?: boolean;
}> = {
  satellite: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye",
    pillDark: true,
  },
  modern: {
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://carto.com/'>CARTO</a>",
    subdomains: "abcd",
    pillDark: false,
  },
  terrain: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
    pillDark: false,
  },
};

const TOGGLE_TABS: { mode: TileMode; label: string; Icon: any }[] = [
  { mode: "satellite", label: "Satellite", Icon: Satellite },
  { mode: "modern",   label: "Modern",    Icon: MapIcon   },
  { mode: "terrain",  label: "3D Terrain", Icon: Mountain  },
];

export function PropertyMap({ properties, onMarkerClick, onMarkerHover, hoveredPropertyId }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const baseTileRef = useRef<any>(null);
  const labelTileRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tileMode, setTileMode] = useState<TileMode>("satellite");

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) { setLoadError(true); return; }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView(NAPLES_CENTER, 13);

      const layer = TILE_LAYERS["satellite"];
      baseTileRef.current = L.tileLayer(layer.base, {
        attribution: layer.attribution,
        maxZoom: 19,
      }).addTo(map);

      if (layer.labels) {
        labelTileRef.current = L.tileLayer(layer.labels, {
          maxZoom: 19,
          opacity: 0.85,
        }).addTo(map);
      }

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    };
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const switchTiles = useCallback((mode: TileMode) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (baseTileRef.current) { map.removeLayer(baseTileRef.current); }
    if (labelTileRef.current) { map.removeLayer(labelTileRef.current); labelTileRef.current = null; }

    const layer = TILE_LAYERS[mode];
    const opts: any = { attribution: layer.attribution, maxZoom: 19 };
    if (layer.subdomains) opts.subdomains = layer.subdomains;
    baseTileRef.current = L.tileLayer(layer.base, opts).addTo(map);

    if (layer.labels) {
      labelTileRef.current = L.tileLayer(layer.labels, {
        maxZoom: 19,
        opacity: 0.85,
      }).addTo(map);
    }

    markersRef.current.forEach((marker) => marker.bringToFront?.());

    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      if (!el) return;
      const pill = el.querySelector(".map-price-pill");
      if (!pill) return;
      if (layer.pillDark) {
        pill.classList.remove("pill-light-bg");
      } else {
        pill.classList.add("pill-light-bg");
      }
    });
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    switchTiles(tileMode);
  }, [tileMode, mapReady, switchTiles]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const map = mapInstanceRef.current;
    const bounds: any[] = [];
    const isLight = !TILE_LAYERS[tileMode].pillDark;

    properties.forEach((property) => {
      const coords = getPropertyCoords(property);
      const unit = property.units?.[0];
      const rent = unit?.rentAmount ?? 0;
      const price = rent > 500 ? rent : rent * 30;

      const pillClass = isLight ? "map-price-pill pill-light-bg" : "map-price-pill";
      const icon = L.divIcon({
        className: "custom-map-marker",
        html: `<div class="${pillClass}" data-id="${property._id}">${formatPrice(price)}</div>`,
        iconSize: [76, 30],
        iconAnchor: [38, 30],
      });

      const marker = L.marker(coords, { icon }).addTo(map);
      marker.on("click", () => { if (onMarkerClick) onMarkerClick(property._id); });
      marker.on("mouseover", () => { if (onMarkerHover) onMarkerHover(property._id); });
      marker.on("mouseout", () => { if (onMarkerHover) onMarkerHover(null); });

      markersRef.current.set(property._id, marker);
      bounds.push(coords);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [properties, mapReady, onMarkerClick, onMarkerHover, tileMode]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const tag = el.querySelector(".map-price-pill");
      if (!tag) return;
      if (id === hoveredPropertyId) {
        tag.classList.add("map-pill-active");
      } else {
        tag.classList.remove("map-pill-active");
      }
    });
  }, [hoveredPropertyId]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
        <div className="text-center p-8">
          <p className="text-lg font-medium mb-2">Map unavailable</p>
          <p className="text-sm">Browse properties from the list on the right</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .map-price-pill {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(.4,0,.2,1);
          letter-spacing: 0.02em;
          background: rgba(15,23,42,0.82);
          color: #f1f5f9;
          border: 1.5px solid rgba(255,255,255,0.18);
          box-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08) inset;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .map-price-pill.pill-light-bg {
          background: rgba(255,255,255,0.92);
          color: #0f172a;
          border: 1.5px solid rgba(15,23,42,0.15);
          box-shadow: 0 2px 8px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.8) inset;
        }
        .map-price-pill:hover,
        .map-pill-active {
          background: rgba(255,255,255,0.97) !important;
          color: #0f172a !important;
          border-color: rgba(99,102,241,0.4) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 3px rgba(99,102,241,0.2) !important;
          transform: scale(1.12) translateY(-2px);
          z-index: 999;
        }
        .custom-map-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(0,0,0,0.45) !important;
          color: rgba(255,255,255,0.55) !important;
          backdrop-filter: blur(4px);
          border-radius: 4px 0 0 0;
        }
        .leaflet-control-attribution a {
          color: rgba(255,255,255,0.6) !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-bottom: 60px !important;
          margin-right: 14px !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          color: #1e293b !important;
          background: rgba(255,255,255,0.92) !important;
          border-bottom: 1px solid rgba(0,0,0,0.08) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(241,245,249,1) !important;
        }
      `}</style>

      <div ref={mapRef} className="w-full h-full rounded-none" />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex rounded-2xl overflow-hidden shadow-2xl border border-white/20"
        style={{ backdropFilter: "blur(12px)" }}>
        {TOGGLE_TABS.map(({ mode, label, Icon }, i) => {
          const active = tileMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setTileMode(mode)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${
                i > 0 ? "border-l border-white/10" : ""
              } ${
                active
                  ? "bg-white text-slate-900 shadow-inner"
                  : "bg-black/55 text-white/75 hover:bg-black/70 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}

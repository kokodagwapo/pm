"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Satellite, Map as MapIcon, Mountain,
  Waves, ShoppingBag, TreePine, Stethoscope, ShoppingCart,
  Sprout, Leaf, BookOpen, Flag, PawPrint, Heart,
} from "lucide-react";

const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  // ── Existing communities ─────────────────────────────────────
  "Falling Waters":        [26.1030, -81.7510],
  "Winter Park":           [26.1780, -81.7960],
  "World Tennis Club":     [26.1550, -81.7650],
  "Glen Eagle":            [26.1200, -81.7420],
  "Moon Lake":             [26.1650, -81.7800],
  "Naples Park":           [26.2650, -81.8080],
  "Royal Arms":            [26.1500, -81.7900],
  "Villas of Whittenberg": [26.1880, -81.7850],

  // ── Seed-35 communities (GPS-verified) ───────────────────────
  "Vanderbilt Beach":      [26.2542, -81.8224],  // 100 Vanderbilt Beach Rd
  "Gulf Shore":            [26.1831, -81.8128],  // Gulf Shore Blvd N, Park Shore
  "Pelican Bay":           [26.2312, -81.8056],  // Pelican Bay community center
  "Moorings":              [26.1538, -81.8042],  // The Moorings, Gulf Shore Blvd N
  "The Moorings":          [26.1538, -81.8042],
  "Park Shore":            [26.1979, -81.8124],  // Park Shore Marina, 4310 Gulf Shore Blvd N
  "Bay Colony":            [26.2282, -81.8046],  // Bay Colony Dr, Pelican Bay north
  "Tiburón":               [26.2469, -81.7661],  // 2620 Tiburon Drive, Naples 34109
  "Tiburon":               [26.2469, -81.7661],
  "Mediterra":             [26.3005, -81.7528],  // 16425 Carrara Way, north Naples
  "North Naples":          [26.2650, -81.7950],
  "Downtown Naples":       [26.1388, -81.7985],  // 5th Ave S area
  "Quail West":            [26.3118, -81.7505],  // 5265 Harrington Lake Dr N
  "Imperial Golf":         [26.2574, -81.7762],  // 1705 Imperial Golf Course Blvd
  "Bonita Beach":          [26.3544, -81.8357],  // Perdido Beach Blvd, Bonita Springs
  "Marco Island":          [25.9149, -81.7217],  // Cape Marco Dr, Marco Island
  "Cape Marco":            [25.9149, -81.7217],
  "Aqualane Shores":       [26.1305, -81.7990],  // Banyan Blvd, Naples 34102
  "Port Royal":            [26.1109, -81.7931],  // Gordon Dr, Naples 34102 (verified)
  "Coquina Sands":         [26.1467, -81.8065],  // Sandpiper St, Naples 34102
  "Old Naples":            [26.1357, -81.8008],  // 3rd St S, Naples 34102
  "Olde Naples":           [26.1357, -81.8008],
  "Grey Oaks":             [26.1888, -81.7624],  // 2400 Grey Oaks Dr N (verified)
  "Twin Eagles":           [26.2858, -81.6617],  // 11725 TwinEagles Blvd (verified)
  "Ave Maria":             [26.3368, -81.4380],  // Ave Maria town center (verified)
  "Cape Coral":            [26.5783, -81.9695],
  "Bonita Springs":        [26.3397, -81.7786],
  "Fiddler":               [26.0820, -81.7140],  // Fiddler's Creek Pkwy (verified)
  "Fiddler's Creek":       [26.0820, -81.7140],
  "Lely":                  [26.0809, -81.6979],  // Lely Resort (verified)
  "Palmira":               [26.3100, -81.8003],  // Palmira, Bonita Springs
  "Talis Park":            [26.3066, -81.8057],  // Talis Park, north Naples
  "Hammock Bay":           [25.9643, -81.6981],  // Hammock Bay, near Marco Island
  "Reflection Lakes":      [26.0850, -81.7153],  // Reflection Lakes, east Naples
  "Bayfront":              [26.1358, -81.7964],  // Bayfront, downtown Naples

  // ── Generic fallback ─────────────────────────────────────────
  "Naples":                [26.1420, -81.7948],
};

const NAPLES_CENTER: [number, number] = [26.1700, -81.7800];

interface Property {
  _id: string;
  name: string;
  address?: { city?: string; state?: string; street?: string; zipCode?: string };
  units?: Array<{ bedrooms?: number; bathrooms?: number; rentAmount?: number }>;
  images?: string[];
  neighborhood?: string;
}

interface NeighborhoodFilter {
  label: string;
  value: string;
}

interface PropertyMapProps {
  properties: Property[];
  onMarkerClick?: (propertyId: string) => void;
  onMarkerHover?: (propertyId: string | null) => void;
  hoveredPropertyId?: string | null;
  neighborhoods?: NeighborhoodFilter[];
  activeNeighborhood?: string;
  onNeighborhoodChange?: (value: string) => void;
}

// Verified street-level centroids for all Naples streets in the current dataset
const STREET_COORDS: Record<string, [number, number]> = {
  "arctic circle":       [26.1364, -81.7631],
  "falling waters blvd": [26.1030, -81.7510],
  "georgetown blvd":     [26.1282, -81.7816],
  "tamiami trail n":     [26.1600, -81.7976],
  "olympic dr":          [26.2230, -81.7690],
  "harwich ct":          [26.1200, -81.7420],
  "moon lake cir":       [26.1650, -81.7800],
  "109th ave n":         [26.2650, -81.8080],
  "whitten dr":          [26.1432, -81.7374],
};

const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "34102": [26.1394, -81.8035], "34103": [26.1673, -81.8107],
  "34104": [26.1400, -81.7404], "34105": [26.1656, -81.7626],
  "34108": [26.2533, -81.8099], "34109": [26.2243, -81.7698],
  "34110": [26.2742, -81.7913], "34112": [26.1022, -81.7461],
  "34113": [26.0749, -81.7163], "34114": [26.0148, -81.6736],
  "34116": [26.1642, -81.7049], "34119": [26.1030, -81.7510],
  "34120": [26.2319, -81.6401],
};

const coordsCache = new Map<string, [number, number]>();

function getPropertyCoords(property: Property): [number, number] {
  if (coordsCache.has(property._id)) return coordsCache.get(property._id)!;
  const jitter = (s: number) => (Math.random() - 0.5) * s;

  // 1. Verified street name lookup
  const rawStreet = property.address?.street || "";
  const streetKey = rawStreet.replace(/^\d+\s+/, "").toLowerCase().trim();
  if (STREET_COORDS[streetKey]) {
    const b = STREET_COORDS[streetKey];
    const r: [number, number] = [b[0] + jitter(0.003), b[1] + jitter(0.003)];
    coordsCache.set(property._id, r);
    return r;
  }

  // 2. Zip code centroid
  const zip = property.address?.zipCode;
  if (zip && ZIP_CENTROIDS[zip]) {
    const b = ZIP_CENTROIDS[zip];
    const r: [number, number] = [b[0] + jitter(0.008), b[1] + jitter(0.008)];
    coordsCache.set(property._id, r);
    return r;
  }

  // 3. Neighborhood name match (case-insensitive)
  const label = (property.neighborhood || property.name || "").toLowerCase();
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (label.includes(key.toLowerCase())) {
      const r: [number, number] = [coords[0] + jitter(0.003), coords[1] + jitter(0.003)];
      coordsCache.set(property._id, r);
      return r;
    }
  }

  // 4. Naples center fallback
  const r: [number, number] = [NAPLES_CENTER[0] + jitter(0.01), NAPLES_CENTER[1] + jitter(0.01)];
  coordsCache.set(property._id, r);
  return r;
}

function formatPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

type TileMode = "satellite" | "modern" | "terrain";

const TILE_LAYERS: Record<TileMode, { base: string; labels?: string; attribution: string; subdomains?: string; pillDark?: boolean }> = {
  satellite: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    pillDark: true,
  },
  modern: {
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    pillDark: false,
  },
  terrain: {
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    pillDark: false,
  },
};

const TOGGLE_TABS: { mode: TileMode; label: string; Icon: any }[] = [
  { mode: "satellite", label: "Satellite", Icon: Satellite },
  { mode: "modern",   label: "Modern",    Icon: MapIcon   },
  { mode: "terrain",  label: "3D Terrain", Icon: Mountain  },
];

interface POICategory {
  id: string;
  label: string;
  emoji: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  pois: { name: string; coords: [number, number] }[];
}

const POI_CATEGORIES: POICategory[] = [
  {
    id: "beaches", label: "Beaches", emoji: "🏖️", Icon: Waves, color: "#0ea5e9",
    pois: [
      { name: "Vanderbilt Beach", coords: [26.2526, -81.8243] },
      { name: "Lowdermilk Park Beach", coords: [26.1442, -81.8125] },
      { name: "Delnor-Wiggins Pass Beach", coords: [26.2767, -81.8270] },
      { name: "Clam Pass Beach", coords: [26.1987, -81.8150] },
      { name: "Naples Public Beach", coords: [26.1387, -81.8070] },
    ],
  },
  {
    id: "malls", label: "Malls", emoji: "🛍️", Icon: ShoppingBag, color: "#a855f7",
    pois: [
      { name: "Waterside Shops", coords: [26.2074, -81.7922] },
      { name: "Mercato", coords: [26.2220, -81.7967] },
      { name: "Coastland Center Mall", coords: [26.1636, -81.7969] },
      { name: "Fifth Avenue South", coords: [26.1388, -81.7985] },
      { name: "Third Street South", coords: [26.1357, -81.8008] },
    ],
  },
  {
    id: "parks", label: "Parks", emoji: "🌳", Icon: TreePine, color: "#10b981",
    pois: [
      { name: "Sugden Regional Park", coords: [26.1356, -81.7625] },
      { name: "North Collier Regional Park", coords: [26.2632, -81.7469] },
      { name: "Freedom Park", coords: [26.1752, -81.7752] },
      { name: "Barefoot Beach Preserve", coords: [26.3073, -81.8368] },
      { name: "Cocohatchee River Park", coords: [26.2940, -81.8126] },
      { name: "Naples Botanical Garden", coords: [26.1068, -81.7711] },
    ],
  },
  {
    id: "hospitals", label: "Hospitals", emoji: "🏥", Icon: Stethoscope, color: "#ef4444",
    pois: [
      { name: "NCH Downtown Naples Hospital", coords: [26.1422, -81.7943] },
      { name: "NCH North Naples Hospital", coords: [26.2732, -81.7899] },
      { name: "Physicians Regional Medical Center", coords: [26.1648, -81.7661] },
      { name: "Naples Community Hospital ER", coords: [26.1422, -81.7943] },
    ],
  },
  {
    id: "groceries", label: "Groceries", emoji: "🛒", Icon: ShoppingCart, color: "#f59e0b",
    pois: [
      { name: "Publix at Coastland", coords: [26.1636, -81.7928] },
      { name: "Publix at Mercato", coords: [26.2212, -81.7985] },
      { name: "Publix Vanderbilt Beach Rd", coords: [26.2413, -81.7800] },
      { name: "Winn-Dixie Naples", coords: [26.1400, -81.7820] },
      { name: "Aldi Naples", coords: [26.1640, -81.7680] },
    ],
  },
  {
    id: "seedtotable", label: "Seed to Table", emoji: "🌱", Icon: Sprout, color: "#84cc16",
    pois: [
      { name: "Seed to Table — 4835 Immokalee Rd", coords: [26.2742, -81.7529] },
    ],
  },
  {
    id: "wholefoods", label: "Whole Foods", emoji: "🥑", Icon: Leaf, color: "#22c55e",
    pois: [
      { name: "Whole Foods Market — Mercato (9101 Strada Pl)", coords: [26.2549, -81.8001] },
    ],
  },
  {
    id: "barnesnoble", label: "Barnes & Noble", emoji: "📚", Icon: BookOpen, color: "#6366f1",
    pois: [
      { name: "Barnes & Noble — 4149 Tamiami Trail N", coords: [26.2063, -81.7989] },
    ],
  },
  {
    id: "golf", label: "Golf", emoji: "⛳", Icon: Flag, color: "#65a30d",
    pois: [
      { name: "Tiburon Golf Club", coords: [26.2469, -81.7661] },
      { name: "Naples Grande Golf Club", coords: [26.2111, -81.8072] },
      { name: "Grey Oaks Country Club", coords: [26.1888, -81.7624] },
      { name: "Lely Resort Golf & CC", coords: [26.0809, -81.6979] },
      { name: "Pelican Bay Golf Course", coords: [26.2160, -81.8118] },
      { name: "Eagle Lakes Golf Club", coords: [26.0720, -81.7180] },
    ],
  },
  {
    id: "dogparks", label: "Dog Parks", emoji: "🐕", Icon: PawPrint, color: "#f97316",
    pois: [
      { name: "Naples North Dog Park", coords: [26.2654, -81.7847] },
      { name: "East Naples Dog Park", coords: [26.1078, -81.7477] },
      { name: "Veterans Community Park Dog Run", coords: [26.2506, -81.7680] },
    ],
  },
  {
    id: "seniors", label: "Senior Care", emoji: "🏡", Icon: Heart, color: "#ec4899",
    pois: [
      { name: "Naples Senior Center", coords: [26.1533, -81.7692] },
      { name: "The Moorings Park", coords: [26.1853, -81.7955] },
      { name: "Moorings Park at Grey Oaks", coords: [26.1700, -81.8120] },
      { name: "Bentley Village CCRC", coords: [26.2341, -81.7851] },
      { name: "The Carlisle Naples", coords: [26.2002, -81.7840] },
      { name: "Brookdale Naples", coords: [26.1580, -81.7850] },
    ],
  },
];

export function PropertyMap({ properties, onMarkerClick, onMarkerHover, hoveredPropertyId, neighborhoods, activeNeighborhood, onNeighborhoodChange }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const poiMarkersRef = useRef<Map<string, any[]>>(new Map());
  const baseTileRef = useRef<any>(null);
  const labelTileRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tileMode, setTileMode] = useState<TileMode>("modern");
  const [activePOI, setActivePOI] = useState<Set<string>>(new Set());

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

      const map = L.map(mapRef.current, { zoomControl: false, scrollWheelZoom: true }).setView(NAPLES_CENTER, 13);

      const layer = TILE_LAYERS["modern"];
      const opts: any = { attribution: layer.attribution, maxZoom: 19 };
      if (layer.subdomains) opts.subdomains = layer.subdomains;
      baseTileRef.current = L.tileLayer(layer.base, opts).addTo(map);
      if (layer.labels) {
        labelTileRef.current = L.tileLayer(layer.labels, { maxZoom: 19, opacity: 0.85 }).addTo(map);
      }

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    };
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  const switchTiles = useCallback((mode: TileMode) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (baseTileRef.current) map.removeLayer(baseTileRef.current);
    if (labelTileRef.current) { map.removeLayer(labelTileRef.current); labelTileRef.current = null; }

    const layer = TILE_LAYERS[mode];
    const opts: any = { attribution: layer.attribution, maxZoom: 19 };
    if (layer.subdomains) opts.subdomains = layer.subdomains;
    baseTileRef.current = L.tileLayer(layer.base, opts).addTo(map);
    if (layer.labels) {
      labelTileRef.current = L.tileLayer(layer.labels, { maxZoom: 19, opacity: 0.85 }).addTo(map);
    }
    markersRef.current.forEach((m) => m.bringToFront?.());
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
      marker.on("click", () => {
        onMarkerClick?.(property._id);
        mapInstanceRef.current?.flyTo(coords, 16, { animate: true, duration: 0.7 });
      });
      marker.on("mouseover", () => onMarkerHover?.(property._id));
      marker.on("mouseout", () => onMarkerHover?.(null));
      markersRef.current.set(property._id, marker);
      bounds.push(coords);
    });

    map.setView(NAPLES_CENTER, 12);
  }, [properties, mapReady, onMarkerClick, onMarkerHover, tileMode]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const tag = el.querySelector(".map-price-pill");
      if (!tag) return;
      if (id === hoveredPropertyId) tag.classList.add("map-pill-active");
      else tag.classList.remove("map-pill-active");
    });
  }, [hoveredPropertyId]);

  const togglePOI = useCallback((catId: string) => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const cat = POI_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;

    setActivePOI((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
        const existing = poiMarkersRef.current.get(catId) || [];
        existing.forEach((m) => m.remove());
        poiMarkersRef.current.delete(catId);
      } else {
        next.add(catId);
        const markers = cat.pois.map((poi) => {
          const icon = L.divIcon({
            className: "custom-poi-marker",
            html: `<div class="poi-bubble" style="background:${cat.color}" title="${poi.name}"><span class="poi-emoji">${cat.emoji}</span></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });
          const m = L.marker(poi.coords, { icon }).addTo(map);
          m.bindTooltip(`<strong>${poi.name}</strong><br/><span style="color:${cat.color};font-size:10px;font-weight:600">${cat.label}</span>`, {
            direction: "top",
            offset: [0, -30],
            className: "poi-tooltip",
          });
          return m;
        });
        poiMarkersRef.current.set(catId, markers);

        if (cat.pois.length === 1) {
          map.flyTo(cat.pois[0].coords, 16, { animate: true, duration: 0.8 });
        } else {
          const bounds = L.latLngBounds(cat.pois.map((p) => p.coords));
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
        }
      }
      return next;
    });
  }, []);

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
          font-weight: 500;
          white-space: nowrap;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(.4,0,.2,1);
          letter-spacing: 0.04em;
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .map-price-pill:hover, .map-pill-active {
          background: rgba(255,255,255,0.97) !important;
          color: #0f172a !important;
          border-color: rgba(99,102,241,0.4) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 3px rgba(99,102,241,0.2) !important;
          transform: scale(1.12) translateY(-2px);
          z-index: 999;
        }
        .custom-map-marker, .custom-poi-marker { background: none !important; border: none !important; }
        .poi-bubble {
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 12px rgba(0,0,0,0.35);
          border: 2px solid rgba(255,255,255,0.6);
        }
        .poi-emoji {
          transform: rotate(45deg);
          font-size: 14px;
          line-height: 1;
        }
        .poi-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
          color: #1e293b !important;
        }
        .poi-tooltip::before { display: none !important; }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(0,0,0,0.45) !important;
          color: rgba(255,255,255,0.55) !important;
          backdrop-filter: blur(4px);
          border-radius: 4px 0 0 0;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.6) !important; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.3) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-bottom: 60px !important;
          margin-right: 14px !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important; height: 36px !important; line-height: 36px !important;
          font-size: 18px !important; color: #1e293b !important;
          background: rgba(255,255,255,0.92) !important;
          border-bottom: 1px solid rgba(0,0,0,0.08) !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover { background: rgba(241,245,249,1) !important; }
      `}</style>

      <div ref={mapRef} className="w-full h-full rounded-none" />

      {/* Compass Rose — top-left */}
      <div className="absolute top-3 left-3 z-[1000] w-16 h-16 select-none pointer-events-none"
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
      >
        <div className="relative w-full h-full bg-black/60 backdrop-blur-md rounded-full border border-white/25 flex items-center justify-center">
          {/* Cardinal labels */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white text-[10px] font-black leading-none tracking-tight">N</span>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/45 text-[9px] font-bold leading-none">S</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/45 text-[9px] font-bold leading-none">E</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/45 text-[9px] font-bold leading-none">W</span>
          {/* Needle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="10" height="28" viewBox="0 0 10 28">
              <polygon points="5,0 9,14 5,12 1,14" fill="#ef4444" />
              <polygon points="5,28 9,14 5,16 1,14" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </div>

      {/* POI Filter strip — scrollable with fade hint */}
      <div className="absolute top-3 left-[76px] right-0 z-[1000]">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide pr-8" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-1.5 pb-0.5 pl-0.5" style={{ width: "max-content" }}>
              {POI_CATEGORIES.map((cat) => {
                const active = activePOI.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => togglePOI(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide whitespace-nowrap transition-all border shadow-sm ${
                      active
                        ? "text-white border-transparent shadow-md scale-105"
                        : "bg-white/90 backdrop-blur-md text-slate-600 border-slate-200/60 hover:bg-white hover:text-slate-900 hover:scale-105 shadow-sm"
                    }`}
                    style={active ? { background: cat.color, borderColor: "transparent", boxShadow: `0 4px 14px ${cat.color}55` } : undefined}
                  >
                    <cat.Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Fade-right scroll hint */}
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.4))" }} />
        </div>
      </div>

      {/* Neighborhood filter chips — bottom overlay, only when provided */}
      {neighborhoods && neighborhoods.length > 0 && onNeighborhoodChange && (
        <div className="absolute bottom-[58px] left-3 right-3 z-[1000]">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide pr-6" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex gap-1.5 pb-0.5" style={{ width: "max-content" }}>
                {neighborhoods.map((n) => {
                  const isActive = n.value === "" ? !activeNeighborhood : activeNeighborhood === n.value;
                  return (
                    <button
                      key={n.value || "all"}
                      onClick={() => onNeighborhoodChange(n.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide whitespace-nowrap transition-all border shadow-sm ${
                        isActive
                          ? "bg-slate-900 text-white border-transparent shadow-md"
                          : "bg-white/90 backdrop-blur-md text-slate-600 border-slate-200/60 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent, rgba(248,247,244,0.8))" }} />
          </div>
        </div>
      )}

      {/* Tile mode toggle — centered bottom */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex rounded-2xl overflow-hidden shadow-2xl border border-white/20"
        style={{ backdropFilter: "blur(12px)" }}
      >
        {TOGGLE_TABS.map(({ mode, label, Icon }, i) => {
          const active = tileMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setTileMode(mode)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wide transition-all ${
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

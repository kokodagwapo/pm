"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Satellite, Map as MapIcon, Mountain,
  Waves, ShoppingBag, TreePine, Stethoscope, ShoppingCart,
  Sprout, Leaf, BookOpen, Flag, PawPrint, Heart,
} from "lucide-react";
import { GoogleMap, Marker, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import { getGoogleMapsBrowserKey, hasGoogleMapsBrowserKey } from "@/lib/google-maps";

const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  // ── Existing communities ─────────────────────────────────────
  "Falling Waters":        [26.1318, -81.7298],
  "Winter Park":           [26.1371, -81.7623],
  "Winterpark":            [26.1371, -81.7623],
  "World Tennis Club":     [26.2188, -81.7692],
  "Glen Eagle":            [26.1200, -81.7420],
  "Glen Eagle Golf & Country Club": [26.1200, -81.7420],
  "Moon Lake":             [26.1454, -81.7420],
  "Naples Park":           [26.2633, -81.8035],
  "Royal Arms":            [26.1282, -81.7816],
  "Villas of Whittenberg": [26.1404, -81.7369],

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
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number];
  location?: { coordinates?: [number, number] };
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

const EXACT_ADDRESS_COORDS: Record<string, [number, number]> = {
  "1200 gulf shore blvd n": [26.1598102, -81.8085476],
  "1500 moorings dr": [26.1970351, -81.7900823],
  "720 5th ave s": [26.1412553, -81.7974019],
  "400 park shore dr": [26.1964008, -81.8090146],
  "4584 w alhambra cir": [26.2026466, -81.7989477],
  "5016 old pond dr": [26.1453996, -81.7420119],
  "844 101st ave n": [26.2632882, -81.8035248],
  "3470 frosty way": [26.1379943, -81.7616886],
  "3605 arctic cir": [26.1365447, -81.7625486],
  "3702 northwinds dr": [26.1370574, -81.762256],
  "3834 snowflake ln": [26.1368082, -81.7606451],
  "5265 whitten dr": [26.1403792, -81.7369489],
  "69 georgetown blvd": [26.1282071, -81.7816172],
};

const STREET_COORDS: Record<string, [number, number]> = {
  "101st ave n": [26.2632882, -81.8035248],
  "5th ave s": [26.1412553, -81.7974019],
  "arctic cir": [26.1365447, -81.7625486],
  "cascades dr": [26.1308, -81.7288],
  "falling waters blvd": [26.1318, -81.7298],
  "georgetown blvd": [26.1282071, -81.7816172],
  "gulf shore blvd n": [26.1598102, -81.8085476],
  "gulf shore dr": [26.2542, -81.8224],
  "harwich ct": [26.1200, -81.7420],
  "hidden lake ct": [26.1315, -81.7294],
  "hidden lake dr": [26.1318, -81.7298],
  "magnolia ave": [26.1304, -81.7281],
  "magnolia": [26.1304, -81.7281],
  "moorings dr": [26.1970351, -81.7900823],
  "moon lake cir": [26.1453996, -81.7420119],
  "northwinds dr": [26.1370574, -81.762256],
  "old pond dr": [26.1453996, -81.7420119],
  "olympic dr": [26.2188, -81.7692],
  "park shore dr": [26.1964008, -81.8090146],
  "pelican bay blvd": [26.2312, -81.8056],
  "snowflake ln": [26.1368082, -81.7606451],
  "tamiami trail n": [26.1600, -81.7976],
  "w alhambra cir": [26.2026466, -81.7989477],
  "whitten dr": [26.1403792, -81.7369489],
  "windy pines": [26.1312, -81.7292],
  "windy pines dr": [26.1312, -81.7292],
};

const ZIP_CENTROIDS: Record<string, [number, number]> = {
  "34102": [26.1660, -81.7990], "34103": [26.1960, -81.8040],
  "34104": [26.1450, -81.7420], "34105": [26.2190, -81.7690],
  "34108": [26.2533, -81.8065], "34109": [26.2243, -81.7698],
  "34110": [26.2742, -81.7913], "34112": [26.1330, -81.7510],
  "34113": [26.0749, -81.7163], "34114": [26.0148, -81.6736],
  "34116": [26.1642, -81.7049], "34119": [26.1030, -81.7510],
  "34120": [26.2319, -81.6401],
};

const coordsCache = new Map<string, [number, number]>();

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function offsetFor(seed: string, scale: number): number {
  const hash = hashString(seed);
  const normalized = (hash % 1000) / 1000;
  return (normalized - 0.5) * scale;
}

function applyOffset(
  coords: [number, number],
  seed: string,
  latScale = 0.0018,
  lngScale = 0.0018
): [number, number] {
  return [
    coords[0] + offsetFor(`${seed}:lat`, latScale),
    coords[1] + offsetFor(`${seed}:lng`, lngScale),
  ];
}

function normalizeStreet(street: string | undefined): string {
  return (street || "")
    .toLowerCase()
    .replace(/,.*$/, "")
    .replace(/\bunit\b.*$/, "")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bcircle\b/g, "cir")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bwest\b/g, "w")
    .replace(/\bnorth\b/g, "n")
    .replace(/\bsouth\b/g, "s")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHouseNumber(street: string): string {
  return street.replace(/^\d+\s*/, "").trim();
}

function getPropertyCoords(property: Property): [number, number] {
  if (coordsCache.has(property._id)) return coordsCache.get(property._id)!;

  if (
    typeof property.latitude === "number" &&
    typeof property.longitude === "number"
  ) {
    const direct: [number, number] = [property.latitude, property.longitude];
    coordsCache.set(property._id, direct);
    return direct;
  }

  if (
    Array.isArray(property.location?.coordinates) &&
    property.location.coordinates.length === 2
  ) {
    const [lng, lat] = property.location.coordinates;
    const direct: [number, number] = [lat, lng];
    coordsCache.set(property._id, direct);
    return direct;
  }

  if (Array.isArray(property.coordinates) && property.coordinates.length === 2) {
    const [lng, lat] = property.coordinates;
    const direct: [number, number] = [lat, lng];
    coordsCache.set(property._id, direct);
    return direct;
  }

  const rawStreet = normalizeStreet(property.address?.street);
  if (rawStreet && EXACT_ADDRESS_COORDS[rawStreet]) {
    const r = applyOffset(EXACT_ADDRESS_COORDS[rawStreet], property._id, 0.00012, 0.00012);
    coordsCache.set(property._id, r);
    return r;
  }

  // 1. Street-level cluster lookup with deterministic offset.
  const streetKey = stripHouseNumber(rawStreet);
  if (streetKey && STREET_COORDS[streetKey]) {
    const r = applyOffset(STREET_COORDS[streetKey], `${property._id}:${rawStreet}`, 0.0014, 0.0014);
    coordsCache.set(property._id, r);
    return r;
  }

  // 2. Zip code centroid.
  const zip = property.address?.zipCode;
  if (zip && ZIP_CENTROIDS[zip]) {
    const r = applyOffset(ZIP_CENTROIDS[zip], `${property._id}:${zip}`, 0.0022, 0.0022);
    coordsCache.set(property._id, r);
    return r;
  }

  // 3. Neighborhood name match (case-insensitive).
  const label = (property.neighborhood || property.name || "").toLowerCase();
  for (const [key, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (label.includes(key.toLowerCase())) {
      const r = applyOffset(coords, `${property._id}:${key}`, 0.0018, 0.0018);
      coordsCache.set(property._id, r);
      return r;
    }
  }

  // 4. Naples center fallback.
  const r = applyOffset(NAPLES_CENTER, property._id, 0.006, 0.006);
  coordsCache.set(property._id, r);
  return r;
}

function formatPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

type TileMode = "satellite" | "modern" | "terrain";

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

const NAPLES_CENTER_LATLNG = { lat: NAPLES_CENTER[0], lng: NAPLES_CENTER[1] };

function mapTypeIdForMode(mode: TileMode): string {
  if (mode === "satellite") return "hybrid";
  if (mode === "terrain") return "terrain";
  return "roadmap";
}

function PropertyMapGoogle({
  properties,
  onMarkerClick,
  onMarkerHover,
  hoveredPropertyId,
  neighborhoods,
  activeNeighborhood,
  onNeighborhoodChange,
  apiKey,
}: PropertyMapProps & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "sspm-rentals-map",
    googleMapsApiKey: apiKey,
  });
  const mapRef = useRef<google.maps.Map | null>(null);
  const [tileMode, setTileMode] = useState<TileMode>("modern");
  const [activePOI, setActivePOI] = useState<Set<string>>(new Set());
  const [poiFlyTarget, setPoiFlyTarget] = useState<string | null>(null);

  const isLightPill = tileMode === "modern";

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || typeof google === "undefined") return;
    map.setMapTypeId(mapTypeIdForMode(tileMode) as google.maps.MapTypeId);
  }, [tileMode, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || typeof google === "undefined") return;
    if (properties.length === 0) {
      map.setCenter(NAPLES_CENTER_LATLNG);
      map.setZoom(12);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    properties.forEach((p) => {
      const c = getPropertyCoords(p);
      bounds.extend({ lat: c[0], lng: c[1] });
    });
    if (properties.length === 1) {
      const c = getPropertyCoords(properties[0]);
      map.setCenter({ lat: c[0], lng: c[1] });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [properties, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !poiFlyTarget || typeof google === "undefined") return;
    const cat = POI_CATEGORIES.find((c) => c.id === poiFlyTarget);
    if (!cat) {
      setPoiFlyTarget(null);
      return;
    }
    if (cat.pois.length === 1) {
      const [lat, lng] = cat.pois[0].coords;
      map.panTo({ lat, lng });
      map.setZoom(16);
    } else {
      const b = new google.maps.LatLngBounds();
      cat.pois.forEach((p) => b.extend({ lat: p.coords[0], lng: p.coords[1] }));
      map.fitBounds(b, { top: 40, right: 40, bottom: 40, left: 40 });
    }
    setPoiFlyTarget(null);
  }, [poiFlyTarget, isLoaded]);

  const togglePOI = useCallback((catId: string) => {
    setActivePOI((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        setPoiFlyTarget(catId);
      }
      return next;
    });
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400">
        <div className="p-8 text-center">
          <p className="mb-2 text-lg font-medium">Map unavailable</p>
          <p className="text-sm">Browse properties from the list on the right</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
        <p className="text-lg font-medium">Loading map…</p>
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
      `}</style>

      <div className="relative h-full w-full">
        <GoogleMap
          mapContainerClassName="h-full w-full rounded-none"
          center={NAPLES_CENTER_LATLNG}
          zoom={13}
          onLoad={onMapLoad}
          options={{
            mapTypeId: mapTypeIdForMode("modern") as google.maps.MapTypeId,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            scrollwheel: true,
          }}
        >
          {properties.map((property) => {
            const coords = getPropertyCoords(property);
            const unit = property.units?.[0];
            const rent = unit?.rentAmount ?? 0;
            const price = rent > 500 ? rent : rent * 30;
            const pos = { lat: coords[0], lng: coords[1] };
            return (
              <OverlayView key={property._id} position={pos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div
                  className={`map-price-pill ${isLightPill ? "pill-light-bg" : ""} ${hoveredPropertyId === property._id ? "map-pill-active" : ""}`}
                  onClick={() => {
                    onMarkerClick?.(property._id);
                    const m = mapRef.current;
                    if (m) {
                      m.panTo(pos);
                      m.setZoom(16);
                    }
                  }}
                  onMouseEnter={() => onMarkerHover?.(property._id)}
                  onMouseLeave={() => onMarkerHover?.(null)}
                  role="presentation"
                >
                  {formatPrice(price)}
                </div>
              </OverlayView>
            );
          })}
          {POI_CATEGORIES.filter((c) => activePOI.has(c.id)).flatMap((cat) =>
            cat.pois.map((poi, idx) => (
              <Marker
                key={`${cat.id}-${idx}-${poi.name}`}
                position={{ lat: poi.coords[0], lng: poi.coords[1] }}
                title={`${poi.name} — ${cat.label}`}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: cat.color,
                  fillOpacity: 0.92,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  scale: 8,
                }}
              />
            ))
          )}
        </GoogleMap>
      </div>

      <div
        className="pointer-events-none absolute left-3 top-3 z-[1000] h-16 w-16 select-none"
        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/25 bg-black/60 backdrop-blur-md">
          <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-black leading-none tracking-tight text-white">
            N
          </span>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold leading-none text-white/45">S</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold leading-none text-white/45">E</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold leading-none text-white/45">W</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="10" height="28" viewBox="0 0 10 28">
              <polygon points="5,0 9,14 5,12 1,14" fill="#ef4444" />
              <polygon points="5,28 9,14 5,16 1,14" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </div>

      <div className="absolute left-[76px] right-0 top-3 z-[1000]">
        <div className="relative">
          <div className="scrollbar-hide overflow-x-auto pr-8" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex gap-1.5 pb-0.5 pl-0.5" style={{ width: "max-content" }}>
              {POI_CATEGORIES.map((cat) => {
                const active = activePOI.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => togglePOI(cat.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-[11px] font-medium tracking-wide shadow-sm transition-all ${
                      active
                        ? "scale-105 border-transparent text-white shadow-md"
                        : "border-slate-200/60 bg-white/90 text-slate-600 shadow-sm backdrop-blur-md hover:scale-105 hover:bg-white hover:text-slate-900"
                    }`}
                    style={
                      active
                        ? { background: cat.color, borderColor: "transparent", boxShadow: `0 4px 14px ${cat.color}55` }
                        : undefined
                    }
                  >
                    <cat.Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-0 right-0 top-0 w-8"
            style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.4))" }}
          />
        </div>
      </div>

      {neighborhoods && neighborhoods.length > 0 && onNeighborhoodChange && (
        <div className="absolute bottom-[58px] left-3 right-3 z-[1000]">
          <div className="relative">
            <div className="scrollbar-hide overflow-x-auto pr-6" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex gap-1.5 pb-0.5" style={{ width: "max-content" }}>
                {neighborhoods.map((n) => {
                  const isActive = n.value === "" ? !activeNeighborhood : activeNeighborhood === n.value;
                  return (
                    <button
                      key={n.value || "all"}
                      type="button"
                      onClick={() => onNeighborhoodChange(n.value)}
                      className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-[11px] font-medium tracking-wide shadow-sm transition-all ${
                        isActive
                          ? "border-transparent bg-slate-900 text-white shadow-md"
                          : "border-slate-200/60 bg-white/90 text-slate-600 backdrop-blur-md hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      {n.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="pointer-events-none absolute bottom-0 right-0 top-0 w-6"
              style={{ background: "linear-gradient(to right, transparent, rgba(248,247,244,0.8))" }}
            />
          </div>
        </div>
      )}

      <div
        className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
        style={{ backdropFilter: "blur(12px)" }}
      >
        {TOGGLE_TABS.map(({ mode, label, Icon }, i) => {
          const active = tileMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTileMode(mode)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium tracking-wide transition-all ${
                i > 0 ? "border-l border-white/10" : ""
              } ${
                active ? "bg-white text-slate-900 shadow-inner" : "bg-black/55 text-white/75 hover:bg-black/70 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function PropertyMap(props: PropertyMapProps) {
  const key = getGoogleMapsBrowserKey();
  if (!hasGoogleMapsBrowserKey()) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-800 px-6 text-center text-slate-300">
        <p className="text-lg font-medium">Map preview</p>
        <p className="max-w-sm text-sm text-slate-400">
          Set{" "}
          <code className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-200">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="rounded bg-slate-700 px-1.5 py-0.5 text-xs">.env.local</code> to enable Google Maps (Maps JavaScript API).
        </p>
      </div>
    );
  }
  return <PropertyMapGoogle {...props} apiKey={key} />;
}

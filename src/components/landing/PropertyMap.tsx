"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";

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

function getPriceClass(price: number): string {
  if (price < 3000) return "marker-mint";
  if (price < 5000) return "marker-sky";
  if (price < 8000) return "marker-violet";
  return "marker-coral";
}

export function PropertyMap({ properties, onMarkerClick, onMarkerHover, hoveredPropertyId }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

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
      if (!L || !mapRef.current) {
        setLoadError(true);
        return;
      }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView(NAPLES_CENTER, 13);

      // CartoDB Positron — clean pastel light map
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Custom zoom control bottom-right
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

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const map = mapInstanceRef.current;
    const bounds: any[] = [];

    properties.forEach((property) => {
      const coords = getPropertyCoords(property);
      const unit = property.units?.[0];
      const rent = unit?.rentAmount ?? 0;
      const price = rent > 500 ? rent : rent * 30;
      const priceClass = getPriceClass(price);

      const icon = L.divIcon({
        className: "custom-map-marker",
        html: `<div class="map-price-tag ${priceClass}" data-id="${property._id}">${formatPrice(price)}</div>`,
        iconSize: [76, 32],
        iconAnchor: [38, 32],
      });

      const marker = L.marker(coords, { icon }).addTo(map);
      marker.on("click", () => {
        if (onMarkerClick) onMarkerClick(property._id);
      });
      marker.on("mouseover", () => {
        if (onMarkerHover) onMarkerHover(property._id);
      });
      marker.on("mouseout", () => {
        if (onMarkerHover) onMarkerHover(null);
      });

      markersRef.current.set(property._id, marker);
      bounds.push(coords);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [properties, mapReady, onMarkerClick, onMarkerHover]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (!el) return;
      const tag = el.querySelector(".map-price-tag");
      if (!tag) return;
      if (id === hoveredPropertyId) {
        tag.classList.add("map-price-tag-active");
      } else {
        tag.classList.remove("map-price-tag-active");
      }
    });
  }, [hoveredPropertyId]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500">
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
        /* 3D Pastel price markers */
        .map-price-tag {
          padding: 5px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          text-align: center;
          cursor: pointer;
          transition: all 0.18s ease;
          letter-spacing: 0.01em;
          position: relative;
        }

        /* Mint — low price */
        .map-price-tag.marker-mint {
          background: linear-gradient(160deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1.5px solid #6ee7b7;
          box-shadow: 0 3px 0 #34d399, 0 5px 10px rgba(16,185,129,0.25);
        }
        /* Sky — mid-low price */
        .map-price-tag.marker-sky {
          background: linear-gradient(160deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e3a8a;
          border: 1.5px solid #93c5fd;
          box-shadow: 0 3px 0 #60a5fa, 0 5px 10px rgba(59,130,246,0.25);
        }
        /* Violet — mid-high price */
        .map-price-tag.marker-violet {
          background: linear-gradient(160deg, #ede9fe 0%, #ddd6fe 100%);
          color: #4c1d95;
          border: 1.5px solid #c4b5fd;
          box-shadow: 0 3px 0 #a78bfa, 0 5px 10px rgba(139,92,246,0.25);
        }
        /* Coral — high price */
        .map-price-tag.marker-coral {
          background: linear-gradient(160deg, #ffedd5 0%, #fed7aa 100%);
          color: #7c2d12;
          border: 1.5px solid #fdba74;
          box-shadow: 0 3px 0 #fb923c, 0 5px 10px rgba(249,115,22,0.25);
        }

        /* Active / hovered state */
        .map-price-tag.map-price-tag-active,
        .map-price-tag:hover {
          transform: scale(1.15) translateY(-2px);
          filter: brightness(0.92) saturate(1.4);
          box-shadow: 0 6px 0 currentColor, 0 10px 20px rgba(0,0,0,0.2);
          z-index: 999;
        }
        .map-price-tag.map-price-tag-active {
          outline: 2px solid rgba(0,0,0,0.15);
          outline-offset: 2px;
        }

        .custom-map-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-bottom: 16px !important;
          margin-right: 16px !important;
        }
        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          color: #1e293b !important;
          background: white !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f8fafc !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full rounded-none" />
    </>
  );
}

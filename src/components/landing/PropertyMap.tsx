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
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(NAPLES_CENTER, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

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

      const icon = L.divIcon({
        className: "custom-map-marker",
        html: `<div class="map-price-tag" data-id="${property._id}">${formatPrice(price)}</div>`,
        iconSize: [70, 28],
        iconAnchor: [35, 28],
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
        .map-price-tag {
          background: #1e293b;
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }
        .map-price-tag:hover, .map-price-tag-active {
          background: #0ea5e9;
          transform: scale(1.1);
          border-color: white;
        }
        .custom-map-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          font-size: 10px !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full rounded-none" />
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface SinglePropertyMapProps {
  lat: number;
  lon: number;
  address?: string;
  propertyName?: string;
}

function escapePopupText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function SinglePropertyMap({ lat, lon, address, propertyName }: SinglePropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    if (!document.querySelector('link[data-sspm-leaflet-css]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-sspm-leaflet-css", "1");
      document.head.appendChild(link);
    }

    const existing = document.querySelector("script[data-sspm-leaflet-js]");
    if (existing) {
      if ((window as any).L) setLeafletReady(true);
      else {
        const done = () => setLeafletReady(true);
        existing.addEventListener("load", done);
        return () => existing.removeEventListener("load", done);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.setAttribute("data-sspm-leaflet-js", "1");
    script.onload = () => setLeafletReady(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletReady || loadError || !mapRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
    }).setView([lat, lon], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const icon = L.divIcon({
      className: "single-property-marker",
      html: `<div class="spm-pin"><div class="spm-dot"></div><div class="spm-ring"></div></div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
    });

    const marker = L.marker([lat, lon], { icon }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    if (propertyName) {
      marker.bindPopup(
        `<div style="font-size:12px;font-weight:700;color:#0f172a;max-width:160px;line-height:1.4">${escapePopupText(propertyName)}</div>` +
          (address ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${escapePopupText(address)}</div>` : ""),
        { closeButton: false, offset: [0, -8] }
      ).openPopup();
    }

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // lat/lon / popup text are applied in the effects below so the map is not torn down on geocode updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, loadError]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.setView([lat, lon], 15);
    markerRef.current.setLatLng([lat, lon]);
  }, [lat, lon]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !propertyName) return;
    const html =
      `<div style="font-size:12px;font-weight:700;color:#0f172a;max-width:160px;line-height:1.4">${escapePopupText(propertyName)}</div>` +
      (address ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${escapePopupText(address)}</div>` : "");
    const popupOpts = { closeButton: false, offset: [0, -8] as [number, number] };
    if (marker.getPopup?.()) {
      marker.setPopupContent(html);
    } else {
      marker.bindPopup(html, popupOpts).openPopup();
    }
  }, [propertyName, address]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
        Map unavailable
      </div>
    );
  }

  return (
    <>
      <style>{`
        .single-property-marker {
          background: none !important;
          border: none !important;
        }
        .spm-pin {
          position: relative;
          width: 48px;
          height: 48px;
        }
        .spm-dot {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #1e293b, #334155);
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          rotate: -45deg;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        }
        .spm-ring {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 4px;
          background: rgba(0,0,0,0.12);
          border-radius: 50%;
          filter: blur(2px);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 10px 14px !important;
        }
        .leaflet-popup-tip-container {
          margin-top: -1px;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(4px);
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important;
          border-radius: 10px !important;
          overflow: hidden;
          margin-bottom: 12px !important;
          margin-right: 12px !important;
        }
        .leaflet-control-zoom a {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 16px !important;
          color: #1e293b !important;
          background: white !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f8fafc !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}

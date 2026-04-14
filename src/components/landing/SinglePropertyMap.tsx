"use client";

import { useEffect, useRef, useState } from "react";
import { getGoogleMapsBrowserKey, hasGoogleMapsBrowserKey } from "@/lib/google-maps";

interface SinglePropertyMapProps {
  lat: number;
  lon: number;
  address?: string;
  propertyName?: string;
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if ((window as any).google?.maps) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gmap-loader="1"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if ((window as any).google?.maps) resolve();
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

export function SinglePropertyMap({ lat, lon, address, propertyName }: SinglePropertyMapProps) {
  const apiKey = getGoogleMapsBrowserKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    const center = { lat, lng: lon };
    const title = propertyName
      ? address
        ? `${propertyName} — ${address}`
        : propertyName
      : address || "Property location";

    try {
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(containerRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scrollwheel: false,
          gestureHandling: "greedy",
        });
        markerRef.current = new g.maps.Marker({ position: center, map: mapRef.current, title });
      } else {
        mapRef.current.setCenter(center);
        if (markerRef.current) {
          markerRef.current.setPosition(center);
          markerRef.current.setTitle(title);
        }
      }
    } catch {
      setError(true);
    }
  }, [ready, lat, lon, address, propertyName]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        try { markerRef.current.setMap(null); } catch {}
        markerRef.current = null;
      }
      mapRef.current = null;
    };
  }, []);

  if (!hasGoogleMapsBrowserKey()) {
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center text-sm text-slate-600">
        <p>
          Add{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to show the map.
        </p>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 underline hover:text-sky-700"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-slate-100/80 text-sm text-slate-400">
          Loading map…
        </div>
      )}
    </div>
  );
}

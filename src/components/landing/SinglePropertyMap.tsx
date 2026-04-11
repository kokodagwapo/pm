"use client";

import { useMemo, useCallback, type CSSProperties } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { getGoogleMapsBrowserKey, hasGoogleMapsBrowserKey } from "@/lib/google-maps";

interface SinglePropertyMapProps {
  lat: number;
  lon: number;
  address?: string;
  propertyName?: string;
}

const mapContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
};

function SinglePropertyMapLoaded({
  lat,
  lon,
  address,
  propertyName,
  apiKey,
}: SinglePropertyMapProps & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "sspm-single-property-map",
    googleMapsApiKey: apiKey,
  });

  const center = useMemo(() => ({ lat, lng: lon }), [lat, lon]);

  const onUnmount = useCallback(() => {}, []);

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        Map unavailable
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-slate-100/80 text-sm text-slate-400">
        Loading map…
      </div>
    );
  }

  return (
    <>
      <style>{`
        .spm-gmap-wrap .gm-style-cc, .spm-gmap-wrap .gmnoprint a { font-size: 9px !important; }
      `}</style>
      <div className="spm-gmap-wrap h-full w-full overflow-hidden rounded-inherit">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            scrollwheel: false,
            gestureHandling: "greedy",
          }}
        >
          <Marker
            position={center}
            title={
              propertyName
                ? address
                  ? `${propertyName} — ${address}`
                  : propertyName
                : address
            }
          />
        </GoogleMap>
      </div>
    </>
  );
}

export function SinglePropertyMap(props: SinglePropertyMapProps) {
  const key = getGoogleMapsBrowserKey();

  if (!hasGoogleMapsBrowserKey()) {
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${props.lat},${props.lon}`
    )}`;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center text-sm text-slate-600">
        <p>Add <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show the map.</p>
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

  return <SinglePropertyMapLoaded {...props} apiKey={key} />;
}

import { getGoogleMapsServerKey } from "@/lib/google-maps";

export interface GeocodeHit {
  lat: number;
  lon: number;
  label?: string;
}

/**
 * Forward geocode: Google first (if key + Geocoding API), then Nominatim.
 */
export async function geocodeAddress(address: string): Promise<GeocodeHit | null> {
  const q = address.trim();
  if (q.length < 4) return null;

  const googleKey = getGoogleMapsServerKey();
  if (googleKey) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", q);
      url.searchParams.set("key", googleKey);
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          status: string;
          results?: Array<{
            formatted_address?: string;
            geometry?: { location?: { lat: number; lng: number } };
          }>;
        };
        const loc = data.results?.[0]?.geometry?.location;
        if (data.status === "OK" && loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          return {
            lat: loc.lat,
            lon: loc.lng,
            label: data.results[0].formatted_address,
          };
        }
      }
    } catch {
      // fall through to Nominatim
    }
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", q);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SmartStartPM/1.0 (property listings; contact via site operator)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = data?.[0];
    if (!hit) return null;
    const lat = Number.parseFloat(hit.lat);
    const lon = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, label: hit.display_name };
  } catch {
    return null;
  }
}

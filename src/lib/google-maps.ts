/**
 * Browser maps use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Maps JavaScript API).
 * Server geocoding can use GOOGLE_MAPS_GEOCODE_KEY or fall back to the same key
 * (enable Geocoding API on the Google Cloud project).
 */
export function getGoogleMapsBrowserKey(): string {
  const browserKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (browserKey) return browserKey;
  return "";
}

export function hasGoogleMapsBrowserKey(): boolean {
  return getGoogleMapsBrowserKey().length > 0;
}

export function getGoogleMapsServerKey(): string {
  return (
    process.env.GOOGLE_MAPS_GEOCODE_KEY ||
    process.env.GOOGLE_MAPS_SERVER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}

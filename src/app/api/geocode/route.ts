import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

const MAX_Q = 400;

/**
 * Forward geocode: Google Geocoding API when configured, else OpenStreetMap Nominatim.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 4) {
    return NextResponse.json({ ok: false, error: "query_too_short" }, { status: 400 });
  }
  if (q.length > MAX_Q) {
    return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
  }

  try {
    const hit = await geocodeAddress(q);
    if (!hit) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lat: hit.lat,
      lon: hit.lon,
      label: hit.label,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 502 });
  }
}

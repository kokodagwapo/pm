import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_Q = 400;

/**
 * Server-side forward geocode via OpenStreetMap Nominatim (usage policy compliant).
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 4) {
    return NextResponse.json({ ok: false, error: "query_too_short" }, { status: 400 });
  }
  if (q.length > MAX_Q) {
    return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SmartStartPM/1.0 (property listings; contact via site operator)",
      },
      next: { revalidate: 86_400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "upstream", status: res.status },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = data?.[0];
    if (!hit) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const lat = Number.parseFloat(hit.lat);
    const lon = Number.parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ ok: false, error: "invalid_coords" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      lat,
      lon,
      label: hit.display_name,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 502 });
  }
}

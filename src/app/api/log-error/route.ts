import { NextRequest, NextResponse } from "next/server";

const recentRequests = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 10;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }

  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const lastRequest = recentRequests.get(ip) || 0;
    const requestCount = now - lastRequest < RATE_LIMIT_WINDOW ? (recentRequests.get(ip + "_count") || 0) + 1 : 1;

    if (requestCount > MAX_REQUESTS) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    recentRequests.set(ip, now);
    recentRequests.set(ip + "_count", requestCount);

    const body = await request.json();
    const message = String(body.message || "").slice(0, 500);
    const url = String(body.url || "").slice(0, 200);
    const stack = String(body.stack || "").slice(0, 2000);

    console.error("=== CLIENT ERROR BOUNDARY ===");
    console.error("URL:", url);
    console.error("Message:", message);
    console.error("Stack:", stack);
    console.error("=== END CLIENT ERROR ===");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Heidi now uses OpenAI Realtime via /api/luna/session.",
    },
    { status: 410 }
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { leaseExpirationService } from "@/lib/services/lease-expiration.service";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(req: Request) {
  try {
    const denied = verifyCronRequest(req);
    if (denied) return denied;

    await connectToDatabase();

    const result = await leaseExpirationService.checkAndExpireLeases();

    return NextResponse.json({
      success: true,
      message: "Lease expiration check completed",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in lease expiration cron:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

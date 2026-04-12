export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const vendors = await Vendor.find({
      "payoutRequests.status": "processing",
    });

    let processed = 0;
    const results: { vendorId: string; referenceId: string; amount: number }[] = [];

    for (const vendor of vendors) {
      let changed = false;
      const reqs = vendor.payoutRequests as Array<{
        status: string;
        amount: number;
        processedAt?: Date;
        referenceId?: string;
      }>;

      for (const req of reqs) {
        if (req.status !== "processing") continue;
        if (!req.processedAt) continue;
        const msSinceProcessed = Date.now() - req.processedAt.getTime();
        if (msSinceProcessed < 60_000) continue;

        req.status = "paid";
        // totalEarnings is already incremented at job release_payment — only mark as paid here
        results.push({
          vendorId: vendor._id.toString(),
          referenceId: req.referenceId || "",
          amount: req.amount,
        });
        changed = true;
        processed++;
      }

      if (changed) await vendor.save();
    }

    return NextResponse.json({
      processed,
      paid: results,
    });
  } catch (error) {
    console.error("GET /api/vendors/wallet/process-payouts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

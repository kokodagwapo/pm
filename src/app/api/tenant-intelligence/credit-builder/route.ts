import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { id: string; role: string };
    if (user.role !== UserRole.TENANT) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();
    const record = await TenantIntelligence.findOne({
      tenantId: new mongoose.Types.ObjectId(user.id),
    })
      .select("creditBuilderOptIn creditBuilderEnrolledAt")
      .lean();

    return NextResponse.json({
      data: {
        optedIn: record?.creditBuilderOptIn ?? false,
        enrolledAt: record?.creditBuilderEnrolledAt ?? null,
      },
    });
  } catch (err) {
    console.error("[CreditBuilder GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { id: string; role: string };
    if (user.role !== UserRole.TENANT) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json() as { optIn?: boolean };
    const optIn = body.optIn !== false;

    await connectDB();
    // Upsert safely: always persist the preference, but use $setOnInsert to mark
    // any newly-created shell record as stale (epoch date) so the cache gate will
    // immediately trigger score recomputation on the next GET — preventing zero-score
    // records from masquerading as fresh intelligence data.
    const existing = await TenantIntelligence.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(user.id) },
      {
        $set: {
          creditBuilderOptIn: optIn,
          creditBuilderEnrolledAt: optIn ? new Date() : null,
        },
        // On insert only: mark as never-calculated so cache gate forces recompute
        $setOnInsert: {
          lastCalculatedAt: new Date(0),
        },
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      data: {
        optedIn: existing.creditBuilderOptIn,
        enrolledAt: existing.creditBuilderEnrolledAt,
      },
      message: optIn
        ? "You've enrolled in the Credit Builder program."
        : "Credit Builder enrollment has been removed.",
    });
  } catch (err) {
    console.error("[CreditBuilder POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

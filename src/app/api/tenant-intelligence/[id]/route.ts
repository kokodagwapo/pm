import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

async function requireAuth(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role || "";
  const allowed = [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT];
  if (!allowed.includes(role as UserRole)) return null;
  return session.user as { id: string; role: string };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: tenantId } = await params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    await connectDB();

    const refresh = new URL(req.url).searchParams.get("refresh") === "true";

    if (!refresh) {
      const cached = await TenantIntelligence.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
      }).lean();
      if (cached) {
        const ageMs = Date.now() - new Date(cached.lastCalculatedAt).getTime();
        if (ageMs < 24 * 60 * 60 * 1000) {
          return NextResponse.json({ data: cached });
        }
      }
    }

    const User = (await import("@/models/User")).default;
    const tenant = await User.findOne({
      _id: tenantId,
      role: UserRole.TENANT,
      deletedAt: null,
    })
      .select("firstName lastName moveInDate")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const result = await computeAndPersistScores({
      tenantId,
      tenantName: `${(tenant as unknown as { firstName?: string }).firstName || ""} ${(tenant as unknown as { lastName?: string }).lastName || ""}`.trim(),
      moveInDate: (tenant as unknown as { moveInDate?: Date }).moveInDate,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[TenantIntelligence GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

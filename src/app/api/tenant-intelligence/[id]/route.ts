import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

async function authorizeForTenant(tenantId: string): Promise<
  | { user: { id: string; role: string }; ok: true }
  | { ok: false; status: number; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };

  const user = session.user as { id: string; role: string };
  const role = user.role as UserRole;

  if (![UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT].includes(role)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (role === UserRole.TENANT) {
    if (user.id !== tenantId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, user };
  }

  if (role === UserRole.OWNER) {
    await connectDB();
    const Lease = (await import("@/models/Lease")).default;
    const Property = (await import("@/models/Property")).default;
    const ownedPropertyIds = await Property.find({ ownerId: user.id, deletedAt: null })
      .select("_id")
      .lean()
      .then((props) => props.map((p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id));
    const leaseExists = await Lease.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      propertyId: { $in: ownedPropertyIds },
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!leaseExists) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, user };
  }

  return { ok: true, user };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const authResult = await authorizeForTenant(tenantId);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();

    const refresh = new URL(req.url).searchParams.get("refresh") === "true";

    if (!refresh) {
      const cached = await TenantIntelligence.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
      }).lean();
      if (cached) {
        const ageMs = Date.now() - new Date(cached.lastCalculatedAt).getTime();
        // Only return cache if: record is fresh (<24h) AND has meaningful scores
        // (at least one non-default signal to detect shell records created by non-scoring writes)
        const hasComputedScores =
          cached.churnRiskScore > 0 ||
          cached.renewalLikelihoodPct !== 50 ||
          cached.delinquencyProbabilityPct !== 10 ||
          cached.lifetimeValueEstimate > 0;
        if (ageMs < 24 * 60 * 60 * 1000 && hasComputedScores) {
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

/**
 * POST /api/tenant-intelligence/[id]
 * Force-recompute and persist tenant intelligence scores (admin/manager only).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as { role?: string }).role;
    if (!role || !["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

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

    return NextResponse.json({ data: result, recomputed: true });
  } catch (err) {
    console.error("[TenantIntelligence POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

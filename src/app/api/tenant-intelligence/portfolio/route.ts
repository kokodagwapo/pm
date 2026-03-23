import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import mongoose from "mongoose";

async function requireManagerAuth() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { id: string; role: string };
  if (![UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(user.role as UserRole)) return null;
  return user;
}

async function getTenantIdsForUser(user: { id: string; role: string }): Promise<mongoose.Types.ObjectId[]> {
  const User = (await import("@/models/User")).default;

  if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id")
      .lean();
    return tenants.map((t) => (t as unknown as { _id: mongoose.Types.ObjectId })._id);
  }

  if (user.role === UserRole.OWNER) {
    const Property = (await import("@/models/Property")).default;
    const Lease = (await import("@/models/Lease")).default;

    const ownedProperties = await Property.find({ ownerId: user.id, deletedAt: null })
      .select("_id")
      .lean();
    const propertyIds = ownedProperties.map((p) => (p as unknown as { _id: mongoose.Types.ObjectId })._id);

    if (propertyIds.length === 0) return [];

    const leases = await Lease.find({
      propertyId: { $in: propertyIds },
      deletedAt: null,
    })
      .select("tenantId")
      .lean();

    const tenantIds = [
      ...new Set(
        leases
          .map((l) => (l as unknown as { tenantId?: mongoose.Types.ObjectId }).tenantId?.toString())
          .filter(Boolean) as string[]
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    return tenantIds;
  }

  return [];
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireManagerAuth();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || "100"), 200);
    const refresh = searchParams.get("refresh") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const skip = (page - 1) * limit;

    const tenantIds = await getTenantIdsForUser(user);
    if (tenantIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const User = (await import("@/models/User")).default;
    const tenants = await User.find({ _id: { $in: tenantIds }, role: UserRole.TENANT, deletedAt: null })
      .select("_id firstName lastName email moveInDate")
      .lean();

    if (tenants.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const activeTenantIds = tenants.map((t) => (t as unknown as { _id: mongoose.Types.ObjectId })._id);

    if (refresh) {
      await Promise.all(
        tenants.slice(0, 50).map((t) => {
          const tt = t as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; moveInDate?: Date };
          return computeAndPersistScores({
            tenantId: tt._id.toString(),
            tenantName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
            moveInDate: tt.moveInDate,
          }).catch(() => null);
        })
      );
    } else {
      const existing = await TenantIntelligence.find({ tenantId: { $in: activeTenantIds } })
        .select("tenantId lastCalculatedAt")
        .lean();

      const existingMap = new Map(
        existing.map((e) => [e.tenantId.toString(), e.lastCalculatedAt])
      );

      const stale = tenants.filter((t) => {
        const tt = t as unknown as { _id: mongoose.Types.ObjectId };
        const lastCalc = existingMap.get(tt._id.toString());
        if (!lastCalc) return true;
        return Date.now() - new Date(lastCalc).getTime() > 24 * 60 * 60 * 1000;
      });

      if (stale.length > 0) {
        await Promise.all(
          stale.slice(0, 20).map((t) => {
            const tt = t as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; moveInDate?: Date };
            return computeAndPersistScores({
              tenantId: tt._id.toString(),
              tenantName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
              moveInDate: tt.moveInDate,
            }).catch(() => null);
          })
        );
      }
    }

    let query: mongoose.FilterQuery<typeof TenantIntelligence> = { tenantId: { $in: activeTenantIds } };

    switch (filter) {
      case "high_churn":
        query = { ...query, churnRiskLevel: "high" };
        break;
      case "medium_churn":
        query = { ...query, churnRiskLevel: "medium" };
        break;
      case "payment_risk":
        query = { ...query, delinquencyProbabilityPct: { $gte: 50 } };
        break;
      case "renewal_soon":
        query = { ...query, "signals.daysUntilLeaseExpiry": { $lte: 90, $gt: 0 } };
        break;
      case "high_ltv":
        query = { ...query, lifetimeValueEstimate: { $gte: 20000 } };
        break;
    }

    const [scores, total] = await Promise.all([
      TenantIntelligence.find(query)
        .sort({ churnRiskScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TenantIntelligence.countDocuments(query),
    ]);

    const tenantMap = new Map(
      tenants.map((t) => {
        const tt = t as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; email?: string };
        return [
          tt._id.toString(),
          { firstName: tt.firstName, lastName: tt.lastName, email: tt.email },
        ];
      })
    );

    const enriched = scores.map((s) => {
      const info = tenantMap.get(s.tenantId.toString());
      return {
        ...s,
        tenantName: info ? `${info.firstName || ""} ${info.lastName || ""}`.trim() : "Unknown",
        tenantEmail: info?.email || "",
      };
    });

    return NextResponse.json({ data: enriched, total, page, limit });
  } catch (err) {
    console.error("[TenantIntelligence Portfolio GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

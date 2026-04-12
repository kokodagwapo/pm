export const dynamic = "force-dynamic";

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
    const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);
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

    // Ensure ALL tenants have a score record — compute in parallel with concurrency cap
    // to avoid missing any tenant from results. Single query for both freshness and score check.
    const existing = await TenantIntelligence.find({ tenantId: { $in: activeTenantIds } })
      .select("tenantId lastCalculatedAt churnRiskScore renewalLikelihoodPct delinquencyProbabilityPct lifetimeValueEstimate")
      .lean();

    const existingMap = new Map(
      existing.map((e) => [e.tenantId.toString(), {
        lastCalc: e.lastCalculatedAt,
        // A record has real computed scores if any key metric differs from schema defaults
        hasScores: e.churnRiskScore > 0 ||
          e.renewalLikelihoodPct !== 50 ||
          e.delinquencyProbabilityPct !== 10 ||
          e.lifetimeValueEstimate > 0,
      }])
    );

    const maxAgeMs = 24 * 60 * 60 * 1000;

    const tenantsNeedingScore = tenants.filter((t) => {
      const tt = t as unknown as { _id: mongoose.Types.ObjectId };
      const entry = existingMap.get(tt._id.toString());
      if (!entry) return true;
      // Shell record (no meaningful scores) → must recompute regardless of age
      if (!entry.hasScores) return true;
      return refresh || (Date.now() - new Date(entry.lastCalc).getTime() > maxAgeMs);
    });

    // Process ALL tenants needing scores in batches of 10 to avoid timeouts
    const BATCH_SIZE = 10;
    const scoringFailures: string[] = [];
    for (let i = 0; i < tenantsNeedingScore.length; i += BATCH_SIZE) {
      const batch = tenantsNeedingScore.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (t) => {
          const tt = t as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; moveInDate?: Date };
          try {
            await computeAndPersistScores({
              tenantId: tt._id.toString(),
              tenantName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
              moveInDate: tt.moveInDate,
            });
          } catch {
            scoringFailures.push(tt._id.toString());
          }
        })
      );
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
      case "renewal_90d":
        query = { ...query, "signals.daysUntilLeaseExpiry": { $lte: 90, $gt: 0 } };
        break;
      case "renewal_60d":
        query = { ...query, "signals.daysUntilLeaseExpiry": { $lte: 60, $gt: 0 } };
        break;
      case "renewal_30d":
        query = { ...query, "signals.daysUntilLeaseExpiry": { $lte: 30, $gt: 0 } };
        break;
      case "high_ltv":
        query = { ...query, lifetimeValueEstimate: { $gte: 20000 } };
        break;
    }

    const [scores, total, portfolioAgg] = await Promise.all([
      TenantIntelligence.find(query)
        .sort({ churnRiskScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TenantIntelligence.countDocuments(query),
      // Portfolio-wide stats computed from ALL matching records (not just this page)
      TenantIntelligence.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            highRisk: { $sum: { $cond: [{ $eq: ["$churnRiskLevel", "high"] }, 1, 0] } },
            mediumRisk: { $sum: { $cond: [{ $eq: ["$churnRiskLevel", "medium"] }, 1, 0] } },
            lowRisk: { $sum: { $cond: [{ $eq: ["$churnRiskLevel", "low"] }, 1, 0] } },
            avgRenewalLikelihood: { $avg: "$renewalLikelihoodPct" },
            avgLifetimeValue: { $avg: "$lifetimeValueEstimate" },
            needsIntervention: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$churnRiskLevel", "high"] }, { $ne: ["$interventionSent", true] }] },
                  1, 0
                ]
              }
            },
          },
        },
      ]),
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

    const aggResult = portfolioAgg[0] ?? {};
    const portfolioStats = {
      total,
      highRisk: aggResult.highRisk ?? 0,
      mediumRisk: aggResult.mediumRisk ?? 0,
      lowRisk: aggResult.lowRisk ?? 0,
      avgRenewalLikelihood: Math.round(aggResult.avgRenewalLikelihood ?? 0),
      avgLifetimeValue: Math.round(aggResult.avgLifetimeValue ?? 0),
      needsIntervention: aggResult.needsIntervention ?? 0,
    };

    return NextResponse.json({
      data: enriched,
      total,
      page,
      limit,
      portfolioStats,
      ...(scoringFailures.length > 0 && { scoringFailures, scoringFailureCount: scoringFailures.length }),
    });
  } catch (err) {
    console.error("[TenantIntelligence Portfolio GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

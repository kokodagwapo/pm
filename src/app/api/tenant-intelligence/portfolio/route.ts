import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import mongoose from "mongoose";

async function requireManagerAuth(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role || "";
  if (![UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(role as UserRole)) return null;
  return session.user as { id: string; role: string };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireManagerAuth(req);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || "100"), 200);
    const refresh = searchParams.get("refresh") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const skip = (page - 1) * limit;

    const User = (await import("@/models/User")).default;

    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id firstName lastName email moveInDate")
      .limit(300)
      .lean();

    if (tenants.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const tenantIds = tenants.map((t) => (t as unknown as { _id: mongoose.Types.ObjectId })._id);

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
      const existing = await TenantIntelligence.find({ tenantId: { $in: tenantIds } })
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

    let query: mongoose.FilterQuery<typeof TenantIntelligence> = { tenantId: { $in: tenantIds } };

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

/**
 * SmartStartPM — Nightly Portfolio Health Snapshot Cron
 *
 * This endpoint should be called once per day by an external scheduler
 * (e.g., Vercel Cron, GitHub Actions, cron.io).
 *
 * It computes the portfolio health score for ALL active manager/admin accounts
 * and persists a daily snapshot to PortfolioHealthSnapshot.
 *
 * Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * Also accessible by authenticated admin sessions for manual triggering.
 *
 * Example usage:
 *   curl -X GET https://yourapp.replit.app/api/cron/portfolio-health-snapshot \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { Property, Lease, Payment, MaintenanceRequest } from "@/models";
import { UserRole, PaymentStatus, LeaseStatus, MaintenanceStatus } from "@/types";
import PortfolioHealthSnapshot from "@/models/PortfolioHealthSnapshot";
import { verifyCronRequestOrAdmin } from "@/lib/cron-auth";

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

async function computeAndPersistSnapshot(managerId: string, role: string): Promise<{
  managerId: string;
  score: number;
  grade: string;
  alreadyExists: boolean;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(currentYear, now.getMonth(), now.getDate());
  const portfolioKey = `user:${managerId}`;

  // Skip if already persisted today
  const existing = await PortfolioHealthSnapshot.findOne({
    portfolioKey,
    date: { $gte: todayStart },
  }).lean();
  if (existing) return { managerId, score: existing.score, grade: existing.grade, alreadyExists: true };

  // Scope properties: admins see all; managers see only properties they are assigned to
  const propertyQuery: Record<string, unknown> = { deletedAt: null };
  if (role === UserRole.MANAGER) {
    propertyQuery.managerId = new mongoose.Types.ObjectId(managerId);
  }
  const properties = await Property.find(propertyQuery).lean();
  const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

  if (!propertyIds.length) return { managerId, score: 0, grade: "N/A", alreadyExists: false };

  const totalUnits = properties.reduce((s, p) => {
    if (p.isMultiUnit) return s + (p.units?.length || p.totalUnits || 1);
    return s + 1;
  }, 0);

  const [activeLeases, paidSum, totalSum, maintTotal, maintCompleted, agedBacklog, delinquencyResult, expiringCount] =
    await Promise.all([
      Lease.find({ propertyId: { $in: propertyIds }, status: LeaseStatus.ACTIVE }).select("propertyId terms.rentAmount endDate").lean(),
      Payment.aggregate([{
        $match: { propertyId: { $in: propertyIds }, deletedAt: null, status: { $in: [PaymentStatus.PAID, PaymentStatus.COMPLETED] },
          $expr: { $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, ninetyDaysAgo] } },
      }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{
        $match: { propertyId: { $in: propertyIds }, deletedAt: null, dueDate: { $gte: ninetyDaysAgo, $lte: now } },
      }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      MaintenanceRequest.countDocuments({ propertyId: { $in: propertyIds }, deletedAt: null, createdAt: { $gte: ninetyDaysAgo } }),
      MaintenanceRequest.countDocuments({ propertyId: { $in: propertyIds }, deletedAt: null, status: MaintenanceStatus.COMPLETED, createdAt: { $gte: ninetyDaysAgo } }),
      MaintenanceRequest.countDocuments({
        propertyId: { $in: propertyIds }, deletedAt: null,
        status: { $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
        createdAt: { $lte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      }),
      Payment.aggregate([{
        $match: { propertyId: { $in: propertyIds }, deletedAt: null,
          status: { $in: [PaymentStatus.OVERDUE, PaymentStatus.LATE, PaymentStatus.SEVERELY_OVERDUE, PaymentStatus.GRACE_PERIOD] } },
      }, { $group: { _id: null, count: { $sum: 1 }, severeCount: { $sum: { $cond: [{ $eq: ["$status", PaymentStatus.SEVERELY_OVERDUE] }, 1, 0] } } } }]),
      Lease.countDocuments({
        propertyId: { $in: propertyIds }, status: LeaseStatus.ACTIVE,
        endDate: { $gte: now, $lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
      }),
    ]);

  const occupancyRate = totalUnits > 0 ? (activeLeases.length / totalUnits) * 100 : 0;
  const collected = paidSum[0]?.total ?? 0;
  const expected = totalSum[0]?.total ?? 0;
  const collectionRate = expected > 0 ? (collected / expected) * 100 : 100;
  const completionRate = maintTotal > 0 ? (maintCompleted / maintTotal) * 100 : 100;
  const delinquentCount = delinquencyResult[0]?.count ?? 0;
  const severeCount = delinquencyResult[0]?.severeCount ?? 0;

  const occupancyScore = clamp((occupancyRate / 100) * 25);
  const collectionScore = clamp((collectionRate / 100) * 20);
  const backlogPenalty = clamp(agedBacklog * 2, 0, 20);
  const maintScore = clamp((completionRate / 100) * 20 - backlogPenalty * 0.2);
  const delinquencyRate = totalUnits > 0 ? delinquentCount / totalUnits : 0;
  const delinquencyScore = clamp(10 - delinquencyRate * 33.3 - severeCount * 2);

  // Rent alignment (15pts)
  let marketRent = 0;
  let unitCount = 0;
  for (const p of properties) {
    if (p.isMultiUnit && Array.isArray(p.units)) {
      for (const u of p.units as { rentAmount?: number }[]) {
        if (u.rentAmount && u.rentAmount > 0) { marketRent += u.rentAmount; unitCount++; }
      }
    }
  }
  marketRent = unitCount > 0 ? marketRent / unitCount : 0;
  let atMarket = 0;
  for (const lease of activeLeases) {
    const rent = (lease as { terms?: { rentAmount?: number } }).terms?.rentAmount ?? 0;
    if (marketRent <= 0 || (marketRent - rent) / marketRent <= 0.1) atMarket++;
  }
  const rentAlignmentRate = activeLeases.length > 0 ? (atMarket / activeLeases.length) * 100 : 100;
  const rentScore = clamp((rentAlignmentRate / 100) * 15);

  // Lease pipeline (10pts)
  const pipelineScore = expiringCount === 0 ? 10 : clamp((1 - expiringCount / Math.max(activeLeases.length, 1)) * 10, 0, 10);

  const totalScore = Math.round(occupancyScore + collectionScore + maintScore + rentScore + pipelineScore + delinquencyScore);
  const grade = totalScore >= 90 ? "A" : totalScore >= 80 ? "B" : totalScore >= 70 ? "C" : totalScore >= 60 ? "D" : "F";

  const components = [
    { label: "Occupancy", score: Math.round(occupancyScore), maxScore: 25, value: `${occupancyRate.toFixed(1)}%`, status: occupancyRate >= 90 ? "good" : occupancyRate >= 75 ? "fair" : "poor" },
    { label: "Collections", score: Math.round(collectionScore), maxScore: 20, value: `${collectionRate.toFixed(1)}%`, status: collectionRate >= 95 ? "good" : collectionRate >= 85 ? "fair" : "poor" },
    { label: "Maintenance", score: Math.round(maintScore), maxScore: 20, value: `${completionRate.toFixed(0)}% resolved`, status: completionRate >= 90 ? "good" : completionRate >= 70 ? "fair" : "poor" },
    { label: "Rent Alignment", score: Math.round(rentScore), maxScore: 15, value: `${rentAlignmentRate.toFixed(0)}% at market`, status: rentAlignmentRate >= 90 ? "good" : rentAlignmentRate >= 70 ? "fair" : "poor" },
    { label: "Lease Pipeline", score: Math.round(pipelineScore), maxScore: 10, value: `${expiringCount} expiring`, status: expiringCount === 0 ? "good" : expiringCount <= 2 ? "fair" : "poor" },
    { label: "Delinquency", score: Math.round(delinquencyScore), maxScore: 10, value: `${delinquentCount} overdue`, status: delinquentCount === 0 ? "good" : delinquentCount <= 2 ? "fair" : "poor" },
  ];

  await PortfolioHealthSnapshot.create({
    date: now,
    managerId: new mongoose.Types.ObjectId(managerId),
    portfolioKey,
    score: totalScore,
    grade,
    components,
    meta: {
      totalProperties: properties.length,
      totalUnits,
      activeLeases: activeLeases.length,
      occupancyRate,
      collectionRate,
      expiringIn60Days: expiringCount,
      delinquentCount,
      agedBacklogCount: agedBacklog,
    },
  });

  return { managerId, score: totalScore, grade, alreadyExists: false };
}

export async function GET(request: NextRequest) {
  try {
    const denied = await verifyCronRequestOrAdmin(request);
    if (denied) return denied;

    await connectDB();

    // Import User model dynamically to avoid circular imports
    const User = (await import("@/models")).User;
    if (!User) return NextResponse.json({ error: "User model unavailable" }, { status: 500 });

    // Fetch all admin and manager users
    const managers = await User.find({
      role: { $in: [UserRole.ADMIN, UserRole.MANAGER] },
      deletedAt: null,
    }).select("_id role").lean();

    const results = await Promise.allSettled(
      managers.map((m) => computeAndPersistSnapshot(
        m._id.toString(),
        (m as { role: string }).role
      ))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const snapshots = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof computeAndPersistSnapshot>>> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({
      success: true,
      message: `Portfolio health snapshots completed: ${succeeded} succeeded, ${failed} failed`,
      data: {
        managersProcessed: managers.length,
        succeeded,
        failed,
        snapshots,
        runAt: new Date(),
      },
    });
  } catch (error: unknown) {
    console.error("Portfolio health snapshot cron error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

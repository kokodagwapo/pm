/**
 * Tenant Intelligence Scoring Service
 * Rule-based scoring engine for predictive tenant analytics.
 * All scores are 0-100 unless noted otherwise.
 */

import connectDB from "@/lib/mongodb";
import type { ITenantIntelligenceSignals } from "@/models/TenantIntelligence";

export interface TenantScoreInput {
  tenantId: string;
  tenantName?: string;
  propertyName?: string;
  monthlyRent?: number;
  moveInDate?: Date | string | null;
}

export interface TenantScoreResult {
  tenantId: string;
  churnRiskScore: number;
  churnRiskLevel: "low" | "medium" | "high";
  renewalLikelihoodPct: number;
  delinquencyProbabilityPct: number;
  lifetimeValueEstimate: number;
  sentimentSignal: "positive" | "neutral" | "negative";
  signals: ITenantIntelligenceSignals;
  explanation: string[];
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(
    0,
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

export async function computeTenantScores(
  input: TenantScoreInput
): Promise<TenantScoreResult> {
  await connectDB();

  const Payment = (await import("@/models/Payment")).default;
  const Lease = (await import("@/models/Lease")).default;
  const MaintenanceRequest = (await import("@/models/MaintenanceRequest")).default;
  const { PaymentStatus, LeaseStatus } = await import("@/types");

  const mongoose = (await import("mongoose")).default;
  const tenantObjId = new mongoose.Types.ObjectId(input.tenantId);
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    payments,
    maintenanceRequests,
    activeLease,
    historicalLeases,
  ] = await Promise.all([
    Payment.find({
      tenantId: tenantObjId,
      dueDate: { $gte: twelveMonthsAgo },
      deletedAt: null,
    })
      .select("status dueDate paidDate amount")
      .lean(),
    MaintenanceRequest.find({
      tenantId: tenantObjId,
      createdAt: { $gte: sixMonthsAgo },
      deletedAt: null,
    })
      .select("createdAt status")
      .lean(),
    Lease.findOne({
      tenantId: tenantObjId,
      status: LeaseStatus.ACTIVE,
      deletedAt: null,
    })
      .select("startDate endDate terms.rentAmount")
      .lean(),
    Lease.find({
      tenantId: tenantObjId,
      status: LeaseStatus.EXPIRED,
      deletedAt: null,
    })
      .select("parentLeaseId")
      .lean(),
  ]);

  const paymentsLast12 = payments.length;
  let latePaymentsLast12 = 0;
  let totalDaysLate = 0;

  for (const p of payments) {
    const due = new Date(p.dueDate);
    const paid = p.paidDate ? new Date(p.paidDate) : null;
    const isLate =
      p.status === PaymentStatus.OVERDUE ||
      (paid && paid > due) ||
      (!paid && due < now && p.status !== PaymentStatus.PAID && p.status !== PaymentStatus.COMPLETED);
    if (isLate) {
      latePaymentsLast12 += 1;
      if (paid) {
        totalDaysLate += Math.max(
          0,
          Math.floor((paid.getTime() - due.getTime()) / 86400000)
        );
      } else {
        totalDaysLate += Math.floor(
          (now.getTime() - due.getTime()) / 86400000
        );
      }
    }
  }

  const avgDaysLate = latePaymentsLast12 > 0 ? totalDaysLate / latePaymentsLast12 : 0;
  const maintenanceRequestsLast6Months = maintenanceRequests.length;

  const monthlyRent =
    input.monthlyRent ??
    (activeLease as unknown as { terms?: { rentAmount?: number } })?.terms?.rentAmount ??
    0;

  const daysUntilLeaseExpiry = activeLease
    ? Math.ceil(
        (new Date((activeLease as unknown as { endDate: Date }).endDate).getTime() - now.getTime()) /
          86400000
      )
    : null;

  const leaseRenewals = historicalLeases.filter(
    (l: unknown) => (l as { parentLeaseId?: unknown }).parentLeaseId
  ).length;

  const tenancyStart = input.moveInDate
    ? new Date(input.moveInDate)
    : activeLease
    ? new Date((activeLease as unknown as { startDate: Date }).startDate)
    : null;
  const tenancyMonths = tenancyStart ? monthsBetween(tenancyStart, now) : 0;

  const sentimentScore = 0;

  const signals: ITenantIntelligenceSignals = {
    paymentsLast12,
    latePaymentsLast12,
    avgDaysLate: Math.round(avgDaysLate),
    maintenanceRequestsLast6Months,
    avgMaintenanceResponseDays: 0,
    conversationResponseRatePercent: 100,
    daysUntilLeaseExpiry,
    leaseRenewals,
    tenancyMonths,
    monthlyRent,
    sentimentScore,
  };

  const explanation: string[] = [];

  let delinquency = 10;
  if (latePaymentsLast12 >= 1) { delinquency += 15; }
  if (latePaymentsLast12 >= 2) { delinquency += 20; }
  if (latePaymentsLast12 >= 3) { delinquency += 20; }
  if (avgDaysLate > 7) { delinquency += 10; }
  if (avgDaysLate > 14) { delinquency += 10; }
  if (daysUntilLeaseExpiry !== null && daysUntilLeaseExpiry <= 30) { delinquency += 5; }
  delinquency = clamp(delinquency);

  if (latePaymentsLast12 >= 3) {
    explanation.push(
      `This tenant has missed or been late on ${latePaymentsLast12} of the last ${paymentsLast12} payments.`
    );
  } else if (latePaymentsLast12 > 0) {
    explanation.push(
      `This tenant made ${latePaymentsLast12} late payment(s) in the last 12 months.`
    );
  } else if (paymentsLast12 > 0) {
    explanation.push("Excellent payment history — all payments on time in the last 12 months.");
  }

  let churnRisk = 20;
  if (latePaymentsLast12 >= 2) { churnRisk += 20; }
  if (maintenanceRequestsLast6Months >= 4) {
    churnRisk += 15;
    explanation.push(
      `High maintenance volume (${maintenanceRequestsLast6Months} requests in 6 months) may indicate property dissatisfaction.`
    );
  }
  if (daysUntilLeaseExpiry !== null && daysUntilLeaseExpiry <= 60 && daysUntilLeaseExpiry > 0) {
    churnRisk += 15;
    explanation.push(`Lease expires in ${daysUntilLeaseExpiry} days — renewal risk is elevated.`);
  }
  if (daysUntilLeaseExpiry !== null && daysUntilLeaseExpiry <= 0) {
    churnRisk += 30;
    explanation.push("Lease has expired. Tenant may be on a month-to-month basis.");
  }
  if (leaseRenewals >= 1) {
    churnRisk -= 15;
    explanation.push(`Tenant has renewed their lease ${leaseRenewals} time(s) — strong retention signal.`);
  }
  if (tenancyMonths >= 24) {
    churnRisk -= 10;
    explanation.push(`Long-term tenant — ${tenancyMonths} months of tenancy reduces churn risk.`);
  }
  churnRisk = clamp(churnRisk);

  const churnRiskLevel: "low" | "medium" | "high" =
    churnRisk >= 60 ? "high" : churnRisk >= 35 ? "medium" : "low";

  let renewalLikelihood = 65;
  renewalLikelihood -= latePaymentsLast12 * 8;
  renewalLikelihood -= maintenanceRequestsLast6Months >= 4 ? 10 : 0;
  renewalLikelihood += leaseRenewals * 10;
  renewalLikelihood += tenancyMonths >= 24 ? 10 : 0;
  renewalLikelihood += daysUntilLeaseExpiry === null || daysUntilLeaseExpiry > 90 ? 5 : 0;
  renewalLikelihood = clamp(renewalLikelihood);

  const expectedRemainingMonths = Math.max(
    3,
    daysUntilLeaseExpiry !== null && daysUntilLeaseExpiry > 0
      ? Math.ceil(daysUntilLeaseExpiry / 30)
      : 12
  );
  const renewalProbability = renewalLikelihood / 100;
  const avgRenewals = leaseRenewals > 0 ? leaseRenewals : 0;
  const ltv =
    monthlyRent *
    (expectedRemainingMonths + avgRenewals * 12 + (renewalProbability >= 0.6 ? 12 : 0));

  const sentimentSignal: "positive" | "neutral" | "negative" =
    latePaymentsLast12 >= 3 || maintenanceRequestsLast6Months >= 5
      ? "negative"
      : leaseRenewals >= 1 || tenancyMonths >= 24
      ? "positive"
      : "neutral";

  if (sentimentSignal === "positive") {
    explanation.push("Sentiment signal is positive based on long tenancy and renewal history.");
  } else if (sentimentSignal === "negative") {
    explanation.push("Sentiment signal is negative — high late payments or maintenance volume detected.");
  }

  if (explanation.length === 0) {
    explanation.push("Tenant profile looks healthy with no notable risk signals.");
  }

  return {
    tenantId: input.tenantId,
    churnRiskScore: churnRisk,
    churnRiskLevel,
    renewalLikelihoodPct: renewalLikelihood,
    delinquencyProbabilityPct: delinquency,
    lifetimeValueEstimate: Math.round(ltv),
    sentimentSignal,
    signals,
    explanation,
  };
}

export async function computeAndPersistScores(
  input: TenantScoreInput
): Promise<TenantScoreResult> {
  const result = await computeTenantScores(input);
  const TenantIntelligence = (await import("@/models/TenantIntelligence")).default;
  const mongoose = (await import("mongoose")).default;

  await TenantIntelligence.findOneAndUpdate(
    { tenantId: new mongoose.Types.ObjectId(input.tenantId) },
    {
      $set: {
        churnRiskScore: result.churnRiskScore,
        churnRiskLevel: result.churnRiskLevel,
        renewalLikelihoodPct: result.renewalLikelihoodPct,
        delinquencyProbabilityPct: result.delinquencyProbabilityPct,
        lifetimeValueEstimate: result.lifetimeValueEstimate,
        sentimentSignal: result.sentimentSignal,
        signals: result.signals,
        explanation: result.explanation,
        lastCalculatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return result;
}

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
  paymentSparkline: number[];
}

/**
 * LLM-based sentiment classification with keyword fallback.
 * Returns score in the same scale as keyword method: positive > 0, negative < 0.
 */
async function classifySentimentWithFallback(
  messages: string[]
): Promise<{ score: number; method: "llm" | "keyword"; totalMessages: number }> {
  const totalMessages = messages.length;
  if (totalMessages === 0) return { score: 0, method: "keyword", totalMessages: 0 };

  const openaiKey = process.env.OPENAI_API_KEY;
  // LLM sentiment: only run when key is configured AND message count is low enough
  // to avoid timeout/cost spikes during batch scoring (cron processes many tenants).
  // Hard cap: skip LLM if more than 5 messages (keyword handles high volume).
  // This prevents latency/cost spikes during nightly batch runs.
  const LLM_MSG_CAP = 5;
  if (openaiKey && messages.length > 0 && messages.length <= LLM_MSG_CAP) {
    try {
      const sample = messages.slice(0, 5).join("\n---\n").slice(0, 1000);
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openaiKey, timeout: 5000 });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [
          {
            role: "system",
            content:
              "You are a property management sentiment analyzer. Given tenant messages, respond with exactly one word: positive, neutral, or negative. Nothing else.",
          },
          { role: "user", content: `Tenant messages:\n${sample}` },
        ],
      });
      const label = (response.choices[0]?.message?.content ?? "").trim().toLowerCase();
      const score = label === "positive" ? 3 : label === "negative" ? -3 : 0;
      return { score, method: "llm", totalMessages };
    } catch {
      // Fall through to keyword on any error (timeout, quota, network)
    }
  }

  const { score } = analyzeMessageSentiment(messages);
  return { score, method: "keyword", totalMessages };
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

const NEGATIVE_KEYWORDS = [
  "broken", "mold", "mould", "leak", "pest", "cockroach", "rat", "mice", "mouse",
  "noisy", "noise", "awful", "terrible", "horrible", "unsafe", "dangerous",
  "unhappy", "disappointed", "frustrated", "angry", "sick", "disgusting",
  "unacceptable", "unresponsive", "ignored", "neglect", "moving out", "leaving",
  "notice", "vacate", "legal", "lawsuit", "evict", "complaint",
];

const POSITIVE_KEYWORDS = [
  "great", "excellent", "wonderful", "love", "amazing", "fantastic", "perfect",
  "happy", "satisfied", "comfortable", "grateful", "appreciate", "thankful",
  "renew", "renewal", "staying", "recommend", "best", "good", "pleasant",
];

function analyzeMessageSentiment(messages: string[]): {
  score: number;
  totalMessages: number;
} {
  if (messages.length === 0) {
    return { score: 0, totalMessages: 0 };
  }
  let negCount = 0;
  let posCount = 0;
  const combined = messages.join(" ").toLowerCase();

  for (const kw of NEGATIVE_KEYWORDS) {
    if (combined.includes(kw)) negCount++;
  }
  for (const kw of POSITIVE_KEYWORDS) {
    if (combined.includes(kw)) posCount++;
  }

  const score = posCount - negCount;
  return {
    score,
    totalMessages: messages.length,
  };
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
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [
    payments,
    maintenanceRequests,
    activeLease,
    historicalLeases,
    recentMessages,
  ] = await Promise.all([
    Payment.find({
      tenantId: tenantObjId,
      dueDate: { $gte: twelveMonthsAgo },
      deletedAt: null,
      // Filter to rent-type payments for precision in delinquency/churn scoring
      type: "rent",
    })
      .select("status dueDate paidDate amount type")
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
    (async () => {
      try {
        const Message = (await import("@/models/Message")).default;
        const Conversation = (await import("@/models/Conversation")).default;
        // Include all non-archived conversations (not just recently-created ones)
        // so we capture recent messages in long-running conversations.
        const convs = await Conversation.find({
          "participants.userId": tenantObjId,
          isArchived: false,
          deletedAt: null,
        })
          .select("_id")
          .lean();
        if (convs.length === 0) return { content: [], totalConversations: 0, repliedConversations: 0, avgReplyLatencyMinutes: 0 };
        const convIds = convs.map((c) => (c as unknown as { _id: mongoose.Types.ObjectId })._id);
        // Only fetch messages from the last 3 months — recency window applied to messages
        const msgs = await Message.find({
          conversationId: { $in: convIds },
          deletedAt: null,
          createdAt: { $gte: threeMonthsAgo },
        })
          .select("content senderId conversationId createdAt")
          .sort({ conversationId: 1, createdAt: 1 })
          .lean();

        const repliedConvSet = new Set<string>();
        const tenantContent: string[] = [];

        // Track messages per conversation for reply latency computation
        type MsgEntry = { senderId: string; createdAt: Date };
        const convMsgs = new Map<string, MsgEntry[]>();

        const tenantIdStr = tenantObjId.toString();
        for (const m of msgs) {
          const mm = m as unknown as {
            senderId: mongoose.Types.ObjectId;
            content?: string;
            conversationId: mongoose.Types.ObjectId;
            createdAt: Date;
          };
          const senderStr = mm.senderId.toString();
          const convStr = mm.conversationId.toString();
          if (!convMsgs.has(convStr)) convMsgs.set(convStr, []);
          convMsgs.get(convStr)!.push({ senderId: senderStr, createdAt: new Date(mm.createdAt) });
          if (senderStr === tenantIdStr) {
            repliedConvSet.add(convStr);
            tenantContent.push(mm.content || "");
          }
        }

        // Compute average reply latency: time from non-tenant message to tenant reply
        const latenciesMs: number[] = [];
        for (const [, msgList] of convMsgs) {
          for (let i = 0; i < msgList.length - 1; i++) {
            if (msgList[i].senderId !== tenantIdStr && msgList[i + 1].senderId === tenantIdStr) {
              latenciesMs.push(msgList[i + 1].createdAt.getTime() - msgList[i].createdAt.getTime());
            }
          }
        }
        const avgReplyLatencyMinutes =
          latenciesMs.length > 0
            ? Math.round(latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length / 60000)
            : 0;

        return {
          content: tenantContent,
          totalConversations: convs.length,
          repliedConversations: repliedConvSet.size,
          avgReplyLatencyMinutes,
        };
      } catch {
        return { content: [], totalConversations: 0, repliedConversations: 0, avgReplyLatencyMinutes: 0 };
      }
    })(),
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

  const paymentSparkline: number[] = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 11 + i, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthPayments = payments.filter((p) => {
      const due = new Date(p.dueDate);
      return due >= monthStart && due <= monthEnd;
    });

    if (monthPayments.length === 0) return 0;
    const allOnTime = monthPayments.every((p) => {
      const due = new Date(p.dueDate);
      const paid = p.paidDate ? new Date(p.paidDate) : null;
      return (
        p.status === PaymentStatus.PAID ||
        p.status === PaymentStatus.COMPLETED ||
        (paid && paid <= due)
      );
    });
    return allOnTime ? 1 : -1;
  });

  const msgData = recentMessages as {
    content: string[];
    totalConversations: number;
    repliedConversations: number;
    avgReplyLatencyMinutes: number;
  };
  // Use LLM sentiment classification with keyword fallback
  const sentimentAnalysis = await classifySentimentWithFallback(msgData.content);
  const conversationResponseRatePct =
    msgData.totalConversations > 0
      ? Math.min(100, Math.round((msgData.repliedConversations / msgData.totalConversations) * 100))
      : 100;

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

  const signals: ITenantIntelligenceSignals = {
    paymentsLast12,
    latePaymentsLast12,
    avgDaysLate: Math.round(avgDaysLate),
    maintenanceRequestsLast6Months,
    avgMaintenanceResponseDays: 0,
    conversationResponseRatePercent: conversationResponseRatePct,
    avgReplyLatencyMinutes: msgData.avgReplyLatencyMinutes,
    daysUntilLeaseExpiry,
    leaseRenewals,
    tenancyMonths,
    monthlyRent,
    sentimentScore: sentimentAnalysis.score,
    sentimentMethod: sentimentAnalysis.method,
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

  if (sentimentAnalysis.score < -2) {
    churnRisk += 10;
    explanation.push("Recent messages contain negative language indicating potential dissatisfaction.");
  } else if (sentimentAnalysis.score > 2) {
    churnRisk -= 5;
    explanation.push("Recent messages show positive sentiment — tenant appears satisfied.");
  }

  if (conversationResponseRatePct < 50) {
    churnRisk += 10;
    explanation.push(
      `Low communication response rate (${conversationResponseRatePct}%) — tenant may be disengaged.`
    );
  }

  // Reply latency signal: slow responses (>8h avg) indicate lower engagement
  const avgLatency = msgData.avgReplyLatencyMinutes;
  if (avgLatency > 480) {
    churnRisk += 5;
    explanation.push(
      `Average tenant reply time is ${avgLatency >= 1440 ? Math.round(avgLatency / 1440) + " day(s)" : Math.round(avgLatency / 60) + "h"} — slow response pattern detected.`
    );
  } else if (avgLatency > 0 && avgLatency <= 60) {
    churnRisk -= 3;
    explanation.push("Tenant responds quickly to messages, indicating high engagement.");
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
  renewalLikelihood += sentimentAnalysis.score > 0 ? 5 : sentimentAnalysis.score < -2 ? -10 : 0;
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
    sentimentAnalysis.score <= -2 || (latePaymentsLast12 >= 3 && maintenanceRequestsLast6Months >= 5)
      ? "negative"
      : sentimentAnalysis.score >= 2 || leaseRenewals >= 1 || tenancyMonths >= 24
      ? "positive"
      : "neutral";

  const sentimentSource = sentimentAnalysis.method === "llm" ? "AI sentiment analysis" : "message keyword analysis";
  if (sentimentSignal === "positive") {
    explanation.push(`Sentiment signal is positive based on ${sentimentSource}, long tenancy, or renewal history.`);
  } else if (sentimentSignal === "negative") {
    explanation.push(`Sentiment signal is negative — ${sentimentSource} or behavioral signals indicate dissatisfaction.`);
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
    paymentSparkline,
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
        paymentSparkline: result.paymentSparkline,
        lastCalculatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return result;
}

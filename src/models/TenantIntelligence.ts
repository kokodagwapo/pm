import mongoose, { Schema, Model } from "mongoose";

export interface ITenantIntelligenceSignals {
  paymentsLast12: number;
  latePaymentsLast12: number;
  avgDaysLate: number;
  maintenanceRequestsLast6Months: number;
  avgMaintenanceResponseDays: number;
  conversationResponseRatePercent: number;
  daysUntilLeaseExpiry: number | null;
  leaseRenewals: number;
  tenancyMonths: number;
  monthlyRent: number;
  sentimentScore: number;
}

export interface ITenantIntelligence {
  tenantId: mongoose.Types.ObjectId;
  churnRiskScore: number;
  churnRiskLevel: "low" | "medium" | "high";
  renewalLikelihoodPct: number;
  delinquencyProbabilityPct: number;
  lifetimeValueEstimate: number;
  sentimentSignal: "positive" | "neutral" | "negative";
  signals: ITenantIntelligenceSignals;
  explanation: string[];
  lastCalculatedAt: Date;
  interventionSent: boolean;
  interventionSentAt: Date | null;
  creditBuilderOptIn: boolean;
  creditBuilderEnrolledAt: Date | null;
}

const SignalsSchema = new Schema<ITenantIntelligenceSignals>(
  {
    paymentsLast12: { type: Number, default: 0 },
    latePaymentsLast12: { type: Number, default: 0 },
    avgDaysLate: { type: Number, default: 0 },
    maintenanceRequestsLast6Months: { type: Number, default: 0 },
    avgMaintenanceResponseDays: { type: Number, default: 0 },
    conversationResponseRatePercent: { type: Number, default: 100 },
    daysUntilLeaseExpiry: { type: Number, default: null },
    leaseRenewals: { type: Number, default: 0 },
    tenancyMonths: { type: Number, default: 0 },
    monthlyRent: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const TenantIntelligenceSchema = new Schema<ITenantIntelligence>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    churnRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    churnRiskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    renewalLikelihoodPct: { type: Number, default: 50, min: 0, max: 100 },
    delinquencyProbabilityPct: { type: Number, default: 10, min: 0, max: 100 },
    lifetimeValueEstimate: { type: Number, default: 0 },
    sentimentSignal: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
    signals: { type: SignalsSchema, default: () => ({}) },
    explanation: { type: [String], default: [] },
    lastCalculatedAt: { type: Date, default: Date.now },
    interventionSent: { type: Boolean, default: false },
    interventionSentAt: { type: Date, default: null },
    creditBuilderOptIn: { type: Boolean, default: false },
    creditBuilderEnrolledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

TenantIntelligenceSchema.index({ churnRiskScore: -1 });
TenantIntelligenceSchema.index({ delinquencyProbabilityPct: -1 });
TenantIntelligenceSchema.index({ renewalLikelihoodPct: 1 });
TenantIntelligenceSchema.index({ lastCalculatedAt: -1 });

const TenantIntelligence: Model<ITenantIntelligence> =
  mongoose.models?.TenantIntelligence ||
  mongoose.model<ITenantIntelligence>("TenantIntelligence", TenantIntelligenceSchema);

export default TenantIntelligence;

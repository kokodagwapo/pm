import mongoose, { Schema, Model } from "mongoose";

export interface IJurisdictionRule {
  _id: string;
  state: string;
  stateCode: string;
  category: string;
  title: string;
  description: string;
  requirementType: "annual" | "quarterly" | "monthly" | "one_time" | "event_triggered";
  daysNoticeRequired: number;
  penaltyDescription?: string;
  maxRentIncreasePercent?: number;
  rentControlled: boolean;
  noticePeriodDays?: number;
  evictionNoticeDays?: number;
  securityDepositMultiple?: number;
  fairHousingProtections: string[];
  referenceUrl?: string;
  effectiveDate?: Date;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const JurisdictionRuleSchema = new Schema<IJurisdictionRule>(
  {
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 2 },
    category: {
      type: String,
      required: true,
      enum: [
        "rent_control",
        "eviction",
        "fair_housing",
        "habitability",
        "security_deposit",
        "notice_requirements",
        "inspection",
        "discrimination",
        "accessibility",
        "lead_disclosure",
        "mold",
        "general",
      ],
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    requirementType: {
      type: String,
      enum: ["annual", "quarterly", "monthly", "one_time", "event_triggered"],
      required: true,
    },
    daysNoticeRequired: { type: Number, default: 0, min: 0 },
    penaltyDescription: { type: String, trim: true, maxlength: 500 },
    maxRentIncreasePercent: { type: Number, min: 0, max: 100 },
    rentControlled: { type: Boolean, default: false },
    noticePeriodDays: { type: Number, min: 0 },
    evictionNoticeDays: { type: Number, min: 0 },
    securityDepositMultiple: { type: Number, min: 0 },
    fairHousingProtections: { type: [String], default: [] },
    referenceUrl: { type: String, trim: true },
    effectiveDate: { type: Date },
    isActive: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

JurisdictionRuleSchema.index({ stateCode: 1, category: 1 });
JurisdictionRuleSchema.index({ stateCode: 1, isActive: 1 });

let JurisdictionRule: Model<IJurisdictionRule>;

if (mongoose.models.JurisdictionRule) {
  JurisdictionRule = mongoose.model<IJurisdictionRule>("JurisdictionRule");
} else {
  JurisdictionRule = mongoose.model<IJurisdictionRule>("JurisdictionRule", JurisdictionRuleSchema);
}

export default JurisdictionRule;

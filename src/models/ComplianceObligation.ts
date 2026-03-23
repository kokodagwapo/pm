import mongoose, { Schema, Model } from "mongoose";

export type ComplianceStatus = "pending" | "in_progress" | "completed" | "overdue" | "waived" | "not_applicable";
export type ComplianceSeverity = "critical" | "high" | "medium" | "low";

export interface IComplianceObligation {
  _id: string;
  propertyId: mongoose.Types.ObjectId;
  jurisdictionRuleId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  status: ComplianceStatus;
  severity: ComplianceSeverity;
  dueDate?: Date;
  completedDate?: Date;
  nextDueDate?: Date;
  recurrence?: "annual" | "quarterly" | "monthly" | "one_time" | "event_triggered";
  assignedTo?: mongoose.Types.ObjectId;
  documents: Array<{
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    uploadedBy?: mongoose.Types.ObjectId;
  }>;
  notes?: string;
  reminderSentAt?: Date;
  tags: string[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceObligationSchema = new Schema<IComplianceObligation>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    jurisdictionRuleId: { type: Schema.Types.ObjectId, ref: "JurisdictionRule" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
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
        "vendor_compliance",
        "license_renewal",
        "insurance",
      ],
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "overdue", "waived", "not_applicable"],
      default: "pending",
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
    },
    dueDate: { type: Date },
    completedDate: { type: Date },
    nextDueDate: { type: Date },
    recurrence: {
      type: String,
      enum: ["annual", "quarterly", "monthly", "one_time", "event_triggered"],
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    documents: {
      type: [
        {
          fileName: { type: String, required: true, trim: true },
          fileUrl: { type: String, required: true, trim: true },
          uploadedAt: { type: Date, default: Date.now },
          uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        },
      ],
      default: [],
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    reminderSentAt: { type: Date },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

ComplianceObligationSchema.index({ propertyId: 1, status: 1 });
ComplianceObligationSchema.index({ propertyId: 1, category: 1 });
ComplianceObligationSchema.index({ dueDate: 1, status: 1 });
ComplianceObligationSchema.index({ status: 1, severity: 1 });
ComplianceObligationSchema.index({ isActive: 1, dueDate: 1 });

let ComplianceObligation: Model<IComplianceObligation>;

if (mongoose.models.ComplianceObligation) {
  ComplianceObligation = mongoose.model<IComplianceObligation>("ComplianceObligation");
} else {
  ComplianceObligation = mongoose.model<IComplianceObligation>("ComplianceObligation", ComplianceObligationSchema);
}

export default ComplianceObligation;

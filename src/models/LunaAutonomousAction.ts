import mongoose, { Schema } from "mongoose";

export type LunaActionCategory =
  | "payment_reminder"
  | "payment_escalation"
  | "maintenance_triage"
  | "maintenance_escalation"
  | "lease_renewal_notice"
  | "lease_expiry_alert"
  | "tenant_communication"
  | "occupancy_alert"
  | "system_digest";

export type LunaActionStatus =
  | "evaluated"
  | "executed"
  | "skipped"
  | "failed"
  | "pending_human"
  | "undone";

export type LunaAutonomyMode = "full" | "supervised" | "off";

export interface ILunaAutonomousAction {
  _id: string;
  category: LunaActionCategory;
  status: LunaActionStatus;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  triggerEvent: string;
  triggerEntityType: "payment" | "lease" | "maintenance" | "tenant" | "property" | "system";
  triggerEntityId?: string;
  affectedUserId?: string;
  affectedPropertyId?: string;
  actionsTaken: string[];
  notificationsSent: string[];
  humanReviewRequired: boolean;
  humanReviewNotes?: string;
  humanReviewedAt?: Date;
  humanReviewedBy?: string;
  executedAt?: Date;
  undoneAt?: Date;
  undoneBy?: string;
  executionError?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LunaAutonomousActionSchema = new Schema<ILunaAutonomousAction>(
  {
    category: {
      type: String,
      enum: [
        "payment_reminder",
        "payment_escalation",
        "maintenance_triage",
        "maintenance_escalation",
        "lease_renewal_notice",
        "lease_expiry_alert",
        "tenant_communication",
        "occupancy_alert",
        "system_digest",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["evaluated", "executed", "skipped", "failed", "pending_human", "undone"],
      default: "evaluated",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    reasoning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    triggerEvent: {
      type: String,
      required: true,
      trim: true,
    },
    triggerEntityType: {
      type: String,
      enum: ["payment", "lease", "maintenance", "tenant", "property", "system"],
      required: true,
    },
    triggerEntityId: {
      type: String,
    },
    affectedUserId: {
      type: String,
    },
    affectedPropertyId: {
      type: String,
    },
    actionsTaken: {
      type: [String],
      default: [],
    },
    notificationsSent: {
      type: [String],
      default: [],
    },
    humanReviewRequired: {
      type: Boolean,
      default: false,
    },
    humanReviewNotes: {
      type: String,
      trim: true,
    },
    humanReviewedAt: {
      type: Date,
    },
    humanReviewedBy: {
      type: String,
    },
    executedAt: {
      type: Date,
    },
    undoneAt: {
      type: Date,
    },
    undoneBy: {
      type: String,
    },
    executionError: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

LunaAutonomousActionSchema.index({ category: 1 });
LunaAutonomousActionSchema.index({ status: 1 });
LunaAutonomousActionSchema.index({ createdAt: -1 });
LunaAutonomousActionSchema.index({ affectedUserId: 1 });
LunaAutonomousActionSchema.index({ affectedPropertyId: 1 });
LunaAutonomousActionSchema.index({ humanReviewRequired: 1, status: 1 });
LunaAutonomousActionSchema.index({ triggerEntityId: 1, category: 1, createdAt: -1 });

if (mongoose.models.LunaAutonomousAction) {
  delete mongoose.models.LunaAutonomousAction;
}

const LunaAutonomousAction = mongoose.model<ILunaAutonomousAction>(
  "LunaAutonomousAction",
  LunaAutonomousActionSchema
);

export default LunaAutonomousAction;

import mongoose, { Schema } from "mongoose";
import type { LunaActionCategory, LunaAutonomyMode } from "./LunaAutonomousAction";

export interface ILunaEscalationContact {
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface ILunaRoleAutonomyConfig {
  role: "admin" | "manager";
  enabledCategories: LunaActionCategory[];
  canApproveActions: boolean;
  canOverrideActions: boolean;
  receivesDigest: boolean;
}

export interface ILunaSettings {
  _id?: string;
  mode: LunaAutonomyMode;
  confidenceThreshold: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  maxActionsPerHour: number;
  humanReviewThreshold: number;
  spendingLimit: number;
  escalationContacts: ILunaEscalationContact[];
  roleAutonomyConfig: ILunaRoleAutonomyConfig[];
  updatedAt?: Date;
  updatedBy?: string;
}

const EscalationContactSchema = new Schema<ILunaEscalationContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const RoleAutonomyConfigSchema = new Schema<ILunaRoleAutonomyConfig>(
  {
    role: { type: String, enum: ["admin", "manager"], required: true },
    enabledCategories: { type: [String], default: [] },
    canApproveActions: { type: Boolean, default: true },
    canOverrideActions: { type: Boolean, default: false },
    receivesDigest: { type: Boolean, default: true },
  },
  { _id: false }
);

const LunaSettingsSchema = new Schema<ILunaSettings>(
  {
    mode: {
      type: String,
      enum: ["full", "supervised", "off"],
      default: "supervised",
    },
    confidenceThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.75,
    },
    enabledCategories: {
      type: [String],
      default: [
        "payment_reminder",
        "maintenance_triage",
        "lease_renewal_notice",
        "lease_expiry_alert",
        "tenant_communication",
        "system_digest",
      ],
    },
    digestEmailEnabled: {
      type: Boolean,
      default: true,
    },
    digestEmailFrequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily",
    },
    maxActionsPerHour: {
      type: Number,
      min: 1,
      max: 200,
      default: 20,
    },
    humanReviewThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.6,
    },
    spendingLimit: {
      type: Number,
      min: 0,
      default: 500,
    },
    escalationContacts: {
      type: [EscalationContactSchema],
      default: [],
    },
    roleAutonomyConfig: {
      type: [RoleAutonomyConfigSchema],
      default: [
        {
          role: "admin",
          enabledCategories: [
            "payment_reminder",
            "payment_escalation",
            "maintenance_triage",
            "maintenance_escalation",
            "lease_renewal_notice",
            "lease_expiry_alert",
            "tenant_communication",
            "system_digest",
          ],
          canApproveActions: true,
          canOverrideActions: true,
          receivesDigest: true,
        },
        {
          role: "manager",
          enabledCategories: [
            "payment_reminder",
            "maintenance_triage",
            "lease_renewal_notice",
            "lease_expiry_alert",
            "tenant_communication",
            "system_digest",
          ],
          canApproveActions: true,
          canOverrideActions: false,
          receivesDigest: true,
        },
      ],
    },
    updatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

if (mongoose.models.LunaSettings) {
  delete mongoose.models.LunaSettings;
}

const LunaSettings = mongoose.model<ILunaSettings>("LunaSettings", LunaSettingsSchema);

export default LunaSettings;

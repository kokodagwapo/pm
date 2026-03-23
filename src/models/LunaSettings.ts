import mongoose, { Schema } from "mongoose";
import type { LunaActionCategory, LunaAutonomyMode } from "./LunaAutonomousAction";

export interface ILunaSettings {
  _id?: string;
  mode: LunaAutonomyMode;
  confidenceThreshold: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  maxActionsPerHour: number;
  humanReviewThreshold: number;
  updatedAt?: Date;
  updatedBy?: string;
}

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

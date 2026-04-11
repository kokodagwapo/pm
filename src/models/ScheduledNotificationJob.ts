import mongoose, { Schema, Model } from "mongoose";

export interface IScheduledNotificationJob {
  notificationId: string;
  notificationType: string;
  userId: mongoose.Types.ObjectId;
  scheduledFor: Date;
  notificationData: Record<string, unknown>;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledNotificationJobSchema = new Schema<IScheduledNotificationJob>(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    notificationType: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
    notificationData: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, collection: "scheduled_notification_jobs" }
);

const ScheduledNotificationJob: Model<IScheduledNotificationJob> =
  mongoose.models.ScheduledNotificationJob ||
  mongoose.model<IScheduledNotificationJob>(
    "ScheduledNotificationJob",
    ScheduledNotificationJobSchema
  );

export default ScheduledNotificationJob;

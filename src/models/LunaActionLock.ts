import mongoose, { Schema } from "mongoose";

export interface ILunaActionLock {
  _id: string;
  lockKey: string;
  createdAt: Date;
}

const LunaActionLockSchema = new Schema<ILunaActionLock>(
  {
    lockKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "luna_action_locks",
  }
);

LunaActionLockSchema.index({ lockKey: 1 }, { unique: true });
LunaActionLockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90000 });

if (mongoose.models.LunaActionLock) {
  delete mongoose.models.LunaActionLock;
}

const LunaActionLock = mongoose.model<ILunaActionLock>("LunaActionLock", LunaActionLockSchema);

export default LunaActionLock;

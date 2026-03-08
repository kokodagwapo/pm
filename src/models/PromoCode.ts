import mongoose, { Schema, Document } from "mongoose";

export interface IPromoCode extends Document {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  minNights: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    minNights: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PromoCode =
  mongoose.models.PromoCode ||
  mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCode;

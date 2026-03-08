import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  propertyId: mongoose.Types.ObjectId;
  guestName: string;
  guestEmail: string;
  rating: number;
  title: string;
  body: string;
  stayMonth?: string;
  approved: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    guestName: { type: String, required: true, trim: true, maxlength: 100 },
    guestEmail: { type: String, required: true, trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    stayMonth: { type: String },
    approved: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Review =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;

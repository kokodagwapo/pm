/**
 * PortfolioHealthSnapshot — stores daily portfolio health scores
 * for week-over-week trending and historical comparison.
 */

import mongoose, { Schema, Model } from "mongoose";

export interface IHealthComponent {
  label: string;
  score: number;
  maxScore: number;
  value: string;
  status: "good" | "fair" | "poor";
}

export interface IPortfolioHealthSnapshot {
  _id: mongoose.Types.ObjectId;
  date: Date;
  managerId?: mongoose.Types.ObjectId;
  portfolioKey: string;
  score: number;
  grade: string;
  components: IHealthComponent[];
  meta: {
    totalProperties: number;
    totalUnits: number;
    activeLeases: number;
    occupancyRate: number;
    collectionRate: number;
    expiringIn60Days: number;
  };
  createdAt: Date;
}

const HealthComponentSchema = new Schema<IHealthComponent>(
  {
    label: String,
    score: Number,
    maxScore: Number,
    value: String,
    status: { type: String, enum: ["good", "fair", "poor"] },
  },
  { _id: false }
);

const PortfolioHealthSnapshotSchema = new Schema<IPortfolioHealthSnapshot>(
  {
    date: { type: Date, required: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    portfolioKey: {
      type: String,
      required: true,
      default: "global",
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String, required: true, maxlength: 2 },
    components: { type: [HealthComponentSchema], default: [] },
    meta: {
      totalProperties: Number,
      totalUnits: Number,
      activeLeases: Number,
      occupancyRate: Number,
      collectionRate: Number,
      expiringIn60Days: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc, ret) => { delete ret.__v; return ret; } },
  }
);

PortfolioHealthSnapshotSchema.index({ portfolioKey: 1, date: -1 });

let PortfolioHealthSnapshot: Model<IPortfolioHealthSnapshot>;

if (mongoose.models.PortfolioHealthSnapshot) {
  PortfolioHealthSnapshot = mongoose.model<IPortfolioHealthSnapshot>("PortfolioHealthSnapshot");
} else {
  PortfolioHealthSnapshot = mongoose.model<IPortfolioHealthSnapshot>(
    "PortfolioHealthSnapshot",
    PortfolioHealthSnapshotSchema
  );
}

export default PortfolioHealthSnapshot;

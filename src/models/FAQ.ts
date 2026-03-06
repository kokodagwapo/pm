import mongoose, { Schema, Document, Model } from "mongoose";

export type FAQCategory = 
  | "general"
  | "payments"
  | "maintenance"
  | "leasing"
  | "owner"
  | "tenant"
  | "emergency"
  | "policies";

export interface IFAQ extends Document {
  question: string;
  answer: string;
  category: FAQCategory;
  keywords: string[];
  isPublished: boolean;
  sortOrder: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  relatedFAQs?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
      trim: true,
      maxlength: [5000, "Answer cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      enum: ["general", "payments", "maintenance", "leasing", "owner", "tenant", "emergency", "policies"],
      required: [true, "Category is required"],
      default: "general",
    },
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator: function (keywords: string[]) {
          return keywords.length <= 20;
        },
        message: "Cannot have more than 20 keywords",
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    relatedFAQs: [{
      type: Schema.Types.ObjectId,
      ref: "FAQ",
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

FAQSchema.index({ category: 1, isPublished: 1, sortOrder: 1 });
FAQSchema.index({ keywords: 1 });
FAQSchema.index({ question: "text", answer: "text", keywords: "text" });
FAQSchema.index({ viewCount: -1 });
FAQSchema.index({ helpfulCount: -1 });

FAQSchema.virtual("helpfulnessRatio").get(function (this: IFAQ) {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return null;
  return Math.round((this.helpfulCount / total) * 100);
});

FAQSchema.methods.incrementView = async function (this: IFAQ) {
  this.viewCount += 1;
  return this.save();
};

FAQSchema.methods.markHelpful = async function (this: IFAQ) {
  this.helpfulCount += 1;
  return this.save();
};

FAQSchema.methods.markNotHelpful = async function (this: IFAQ) {
  this.notHelpfulCount += 1;
  return this.save();
};

FAQSchema.statics.findByCategory = function (category: FAQCategory, publishedOnly = true) {
  const query: any = { category };
  if (publishedOnly) {
    query.isPublished = true;
  }
  return this.find(query).sort({ sortOrder: 1, helpfulCount: -1 });
};

FAQSchema.statics.search = function (searchTerm: string, limit = 10) {
  return this.find(
    {
      $text: { $search: searchTerm },
      isPublished: true,
    },
    {
      score: { $meta: "textScore" },
    }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit);
};

FAQSchema.statics.getPopular = function (limit = 10) {
  return this.find({ isPublished: true })
    .sort({ viewCount: -1, helpfulCount: -1 })
    .limit(limit);
};

let FAQ: Model<IFAQ>;

if (mongoose.models?.FAQ) {
  delete mongoose.models.FAQ;
}

FAQ = mongoose.model<IFAQ>("FAQ", FAQSchema);

export default FAQ;

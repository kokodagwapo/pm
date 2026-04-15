import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgeChunk extends Document {
  content: string;
  embedding: number[];
  sourceUrl: string;
  title: string;
  category: "property" | "area_info" | "policy" | "owner_info" | "contact";
  metadata: {
    propertyId?: string;
    neighborhood?: string;
    amenities?: string[];
    lastScraped: Date;
  };
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    sourceUrl: { type: String, required: true },
    title: { type: String, required: true },
    category: { 
      type: String, 
      enum: ["property", "area_info", "policy", "owner_info", "contact"],
      required: true 
    },
    metadata: {
      propertyId: { type: String },
      neighborhood: { type: String },
      amenities: [{ type: String }],
      lastScraped: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// Index for vector search (Atlas Vector Search compatible)
// Note: You must also create the search index in Atlas UI with "vector" type
knowledgeChunkSchema.index({ embedding: "2dsphere" }); 
knowledgeChunkSchema.index({ category: 1 });
knowledgeChunkSchema.index({ "metadata.propertyId": 1 });

const KnowledgeChunk = mongoose.models.KnowledgeChunk || mongoose.model<IKnowledgeChunk>("KnowledgeChunk", knowledgeChunkSchema);

export default KnowledgeChunk;

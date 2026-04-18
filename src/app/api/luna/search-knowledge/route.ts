import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import KnowledgeChunk from "@/models/KnowledgeChunk";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    await connectDB();

    // 1. Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.replace(/\n/g, " "),
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Perform vector search using MongoDB aggregation
    // Note: This requires a vector search index named 'vector_index' on the 'knowledgechunks' collection
    // If vector search is not set up, we fall back to a simple text search or return a hint.
    
    let results = [];
    try {
      results = await KnowledgeChunk.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $project: {
            content: 1,
            title: 1,
            sourceUrl: 1,
            category: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);
    } catch (err) {
      console.warn("Vector search failed (index might not exist), falling back to text search:", err);
      // Fallback: simple text match if vector search fails
      results = await KnowledgeChunk.find({
        $or: [
          { content: { $regex: query, $options: "i" } },
          { title: { $regex: query, $options: "i" } }
        ]
      })
      .limit(5)
      .select("content title sourceUrl category");
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Knowledge search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

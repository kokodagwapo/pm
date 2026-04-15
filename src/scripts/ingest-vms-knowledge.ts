import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import KnowledgeChunk from "../models/KnowledgeChunk";
import connectDB from "../lib/mongodb";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VMS_BASE = "https://vms-florida.com";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}

function chunkText(text: string, size: number = 800, overlap: number = 150): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function ingestUrl(url: string, category: any, title: string) {
  console.log(`Ingesting ${url} (${category})...`);
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, etc.
    $("script, style, nav, footer, header").remove();
    
    // Get clean text content
    const rawText = $("body").text().replace(/\s+/g, " ").trim();
    const chunks = chunkText(rawText);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      await KnowledgeChunk.create({
        content: chunk,
        embedding,
        sourceUrl: url,
        title,
        category,
        metadata: {
          lastScraped: new Date(),
        },
      });
    }
    console.log(`✅ Ingested ${chunks.length} chunks for ${title}`);
  } catch (e) {
    console.error(`❌ Failed to ingest ${url}:`, (e as Error).message);
  }
}

async function run() {
  await connectDB();
  console.log("Connected to MongoDB for Knowledge Ingestion");

  // Priority URLs for Luna
  const targetUrls = [
    { url: "https://vms-florida.com/", category: "area_info", title: "VMS Florida Home" },
    { url: "https://vms-florida.com/naples-florida/", category: "area_info", title: "Naples, Florida Guide" },
    { url: "https://vms-florida.com/vanderbilt-beach-naples-fl/", category: "area_info", title: "Vanderbilt Beach Info" },
    { url: "https://vms-florida.com/contact/", category: "contact", title: "Contact Us" },
    { url: "https://vms-florida.com/privacy-policy-2/", category: "policy", title: "Policies" },
    { url: "https://vms-florida.com/owners/", category: "owner_info", title: "Property Management for Owners" },
  ];

  for (const item of targetUrls) {
    await ingestUrl(item.url, item.category, item.title);
    await new Promise(r => setTimeout(r, 1000)); // Be nice
  }

  console.log("Ingestion complete. You may need to create a Vector Search index in MongoDB Atlas for optimal retrieval.");
  process.exit(0);
}

run().catch(console.error);

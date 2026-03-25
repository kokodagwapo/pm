/**
 * Scrape a single VMS Florida property page for gallery images + detail text,
 * then update the matching Property in MongoDB (importSource vms-florida.com).
 *
 * Usage:
 *   npx tsx src/scripts/import-vms-property-url.ts "https://vms-florida.com/properties/..."
 */

import dotenv from "dotenv";
import path from "path";
import * as cheerio from "cheerio";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import Property from "../models/Property";

const VMS_SOURCE = "vms-florida.com";

function normalizeUrl(u: string): string {
  return u.replace(/\/$/, "");
}

/** WP Rentals often omits the full gallery on “(Copy)” pages; twin is same slug without `-copy`. */
function twinListingUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    if (!/-copy\/?$/i.test(u.pathname)) return null;
    u.pathname = u.pathname.replace(/-copy\/?$/i, "/");
    return normalizeUrl(u.toString());
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

function amenityCategory(name: string): string {
  const n = name.toLowerCase();
  if (/pool|beach|garden|patio|balcony|parking|grill|yard/i.test(n)) return "Outdoor";
  if (/wifi|internet|tv|cable/i.test(n)) return "Utilities";
  if (/kitchen|dishwasher|dryer|washer|linens|towel|bed|bath|essentials/i.test(n))
    return "Kitchen";
  if (/air|smoke|hanger|non smoking/i.test(n)) return "Climate";
  return "Other";
}

interface Scraped {
  title: string;
  propertyId: string | null;
  description: string;
  sleepingNotes: string;
  imageUrls: string[];
  featureNames: string[];
}

function collectGalleryUrls($: cheerio.CheerioAPI): string[] {
  const imageUrls: string[] = [];
  const push = (href: string | undefined) => {
    if (!href || !href.includes("wp-content/uploads") || href.includes("site-icon")) return;
    // Skip tiny theme thumbs; keep -scaled and medium/large sizes for dedupe step
    if (/-60x60\.|-100x100\.|-300x300\.|-400x314\./i.test(href)) return;
    if (!imageUrls.includes(href)) imageUrls.push(href);
  };

  $('a[data-fancybox="website_rental_gallery"]').each((_, el) => {
    push($(el).attr("href"));
  });

  if (imageUrls.length < 3) {
    $('a[href*="wp-content/uploads/20"][rel*="fancybox"]').each((_, el) => {
      push($(el).attr("href"));
    });
  }

  return imageUrls;
}

function scrapeDetail(html: string, pageUrl: string, extraHtml?: string): Scraped {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || "VMS listing";

  const idMatch = $("body").text().match(/Property ID:\s*(\d+)/i);
  const propertyId = idMatch ? idMatch[1] : null;

  let imageUrls = collectGalleryUrls($);
  if (extraHtml) {
    const $2 = cheerio.load(extraHtml);
    for (const u of collectGalleryUrls($2)) {
      if (!imageUrls.includes(u)) imageUrls.push(u);
    }
  }

  if (imageUrls.length < 3) {
    $('a[href*="wp-content/uploads/20"]').each((_, el) => {
      const href = $(el).attr("href");
      if (
        href &&
        /\.(jpe?g|png|webp)(\?|$)/i.test(href) &&
        !href.includes("site-icon") &&
        !imageUrls.includes(href)
      ) {
        imageUrls.push(href);
      }
    });
  }

  // Prefer `-scaled` / large originals when duplicate sizes exist
  const byBase = new Map<string, string>();
  for (const u of imageUrls) {
    const key = u.replace(/-\d+x\d+(?=\.(jpe?g|png|webp))/i, "").replace(/-scaled/i, "");
    const prev = byBase.get(key);
    if (!prev || prev.length < u.length) byBase.set(key, u);
  }
  imageUrls = [...byBase.values()];

  // Description: first substantial block after "Property Description"
  let description = "";
  $("h4, h3").each((_, el) => {
    const t = $(el).text().trim();
    if (/property description/i.test(t)) {
      let cur = $(el).next();
      const parts: string[] = [];
      let guard = 0;
      while (cur.length && guard++ < 12) {
        const tag = cur.prop("tagName")?.toLowerCase();
        if (tag === "h4" || tag === "h3") break;
        const text = cur.text().trim();
        if (text && text !== "View more") parts.push(text);
        cur = cur.next();
      }
      description = parts.join("\n\n").slice(0, 2000);
    }
  });
  if (!description) {
    description = $('meta[property="og:description"]').attr("content")?.slice(0, 2000) || "";
  }

  // Sleeping situation → unit notes
  const sleepingChunks: string[] = [];
  $("h4, h3, strong").each((_, el) => {
    const t = $(el).text().trim();
    if (/^Bedroom\s+\d+/i.test(t)) {
      const li = $(el).parent().text().replace(/\s+/g, " ").trim();
      if (li.length < 200) sleepingChunks.push(li);
    }
  });
  if (sleepingChunks.length === 0) {
    let inSleeping = false;
    $("h4, h3").each((_, el) => {
      const t = $(el).text().trim();
      if (/sleeping situation/i.test(t)) inSleeping = true;
      else if (inSleeping && /property address|property details/i.test(t)) inSleeping = false;
      else if (inSleeping) {
        const block = $(el).nextUntil("h4, h3").text().replace(/\s+/g, " ").trim();
        if (block) sleepingChunks.push(block.slice(0, 500));
      }
    });
  }
  const sleepingNotes = [...new Set(sleepingChunks)].join(" | ").slice(0, 800);

  // Amenities / features — common WP listing patterns
  const featureNames: string[] = [];
  const seen = new Set<string>();
  $(
    ".features_wrapper li, .property_features li, ul.listing_features li, .amenities_list li, #carousel-listing li"
  ).each((_, el) => {
    const raw = $(el).text().replace(/\s+/g, " ").trim();
    if (raw.length > 1 && raw.length < 120 && !seen.has(raw.toLowerCase())) {
      seen.add(raw.toLowerCase());
      featureNames.push(raw);
    }
  });

  if (featureNames.length === 0) {
    $("body *")
      .filter((_, el) => $(el).children().length === 0)
      .each((_, el) => {
        const raw = $(el).text().trim();
        if (
          raw.length > 2 &&
          raw.length < 80 &&
          /^[A-Z]/.test(raw) &&
          !/^\$|USD|night|Guests|Bedroom|Bathroom|Naples|Florida|Login/i.test(raw)
        ) {
          const p = $(el).parent().attr("class") || "";
          if (/feature|amenit|listing|include/i.test(p) && !seen.has(raw.toLowerCase())) {
            seen.add(raw.toLowerCase());
            featureNames.push(raw);
          }
        }
      });
  }

  return {
    title,
    propertyId,
    description: description || `${title} (imported from ${pageUrl})`.slice(0, 2000),
    sleepingNotes,
    imageUrls: imageUrls.slice(0, 20),
    featureNames: featureNames.slice(0, 40),
  };
}

async function main() {
  const urlArg =
    process.argv[2] ||
    "https://vms-florida.com/properties/lakeview-house-near-park-shore-3-bed-3bath-900-copy/";
  const pageUrl = normalizeUrl(urlArg);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing (.env.local)");

  console.log("Fetching", pageUrl);
  const html = await fetchHtml(pageUrl);
  let twinHtml: string | undefined;
  const twin = twinListingUrl(pageUrl);
  if (twin) {
    console.log("Fetching twin listing (full gallery):", twin);
    try {
      twinHtml = await fetchHtml(twin);
    } catch (e) {
      console.warn("Twin fetch failed:", (e as Error).message);
    }
  }
  const scraped = scrapeDetail(html, pageUrl, twinHtml);
  console.log("Parsed:", {
    title: scraped.title,
    propertyId: scraped.propertyId,
    images: scraped.imageUrls.length,
    features: scraped.featureNames.length,
  });

  await mongoose.connect(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 15000 });

  const orMatch: Record<string, unknown>[] = [
    { importListingUrl: pageUrl },
    { importListingUrl: `${pageUrl}/` },
  ];
  if (twin) {
    orMatch.push({ importListingUrl: twin }, { importListingUrl: `${twin}/` });
  }
  if (scraped.propertyId) {
    orMatch.push({ importExternalId: scraped.propertyId });
  }

  const doc = await Property.findOne({
    importSource: VMS_SOURCE,
    $or: orMatch,
  });

  if (!doc) {
    console.error(
      "No property found with importSource=vms-florida.com and matching URL or Property ID.",
      "Run npm run db:vms-only first or create the row."
    );
    process.exit(1);
  }

  const images =
    scraped.imageUrls.length > 0
      ? scraped.imageUrls
      : doc.images?.length
        ? doc.images
        : [];

  const amenities = scraped.featureNames.map((name) => ({
    name: name.slice(0, 100),
    category: amenityCategory(name),
  }));

  doc.name = scraped.title.slice(0, 200);
  if (scraped.description) doc.description = scraped.description;
  if (images.length) {
    doc.images = images.slice(0, 20);
    if (doc.units?.[0]) {
      doc.units[0].images = images.slice(0, 15);
      const extraNotes = [
        doc.units[0].notes || "",
        scraped.sleepingNotes ? `Beds: ${scraped.sleepingNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (extraNotes.length < 1000) doc.units[0].notes = extraNotes.slice(0, 1000);
    }
  }
  if (amenities.length) doc.amenities = amenities;
  if (scraped.propertyId) doc.importExternalId = scraped.propertyId;
  doc.importListingUrl = pageUrl;

  await doc.save();
  console.log("✅ Updated property", doc._id.toString(), doc.name);
  console.log("   Images:", doc.images?.length ?? 0);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

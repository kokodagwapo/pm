/**
 * Sync all VMS Florida vacation listings from https://vms-florida.com/advanced-search/
 * (including paginated /advanced-search/page/N/) into MongoDB.
 *
 * For each listing page, reads:
 * - Exact address (WP Rentals "Property Address" panel: street, city, zip, state, country)
 * - Map pin coordinates (mapfunctions_vars.single_marker)
 * - Gallery images, description, bedrooms/bathrooms, nightly rate, features/amenities
 * - WordPress property ID (importExternalId)
 *
 * Usage:
 *   npm run migrate:vms
 *
 * Environment (.env.local):
 *   MONGODB_URI              — required (development / primary)
 *   MONGODB_URI_PRODUCTION   — optional; when set, the same upserts run against production
 *
 * Safety:
 *   DRY_RUN=1                — fetch + parse only, no database writes
 *
 * Rate limiting: ~450ms delay between listing requests (be polite to vms-florida.com).
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import * as cheerio from "cheerio";
import Property from "../models/Property";
import User from "../models/User";

const VMS_BASE = "https://vms-florida.com";
const ADVANCED_SEARCH_URL = `${VMS_BASE}/advanced-search/`;
const VMS_SOURCE = "vms-florida.com";
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/** Collect unique /properties/{slug}/ URLs from advanced search (all paginated pages). */
async function collectAllListingUrls(): Promise<string[]> {
  const seen = new Set<string>();
  for (let page = 1; page <= 60; page++) {
    const url =
      page === 1 ? ADVANCED_SEARCH_URL : `${VMS_BASE}/advanced-search/page/${page}/`;
    let html: string;
    try {
      html = await fetchHtml(url);
    } catch {
      if (page === 1) throw new Error(`Could not load ${url}`);
      break;
    }
    const $ = cheerio.load(html);
    const onPage: string[] = [];
    $('a[href*="/properties/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const abs = href.startsWith("http") ? href : `${VMS_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
      if (!abs.includes("/properties/")) return;
      if (/\/properties\/?$/i.test(abs)) return;
      const clean = abs.split("#")[0].replace(/\/$/, "");
      if (clean.includes("/properties/")) onPage.push(clean);
    });
    const uniqueOnPage = [...new Set(onPage)];
    let newCount = 0;
    for (const u of uniqueOnPage) {
      if (!seen.has(u)) {
        seen.add(u);
        newCount++;
      }
    }
    if (page > 1 && newCount === 0) break;
    if (uniqueOnPage.length === 0 && page > 1) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  return [...seen];
}

function stripLabel(text: string, label: RegExp): string {
  return text.replace(/\s+/g, " ").replace(label, "").trim();
}

function normalizeState(raw: string): string {
  const s = raw.trim();
  if (/^florida$/i.test(s)) return "FL";
  if (s.length === 2) return s.toUpperCase();
  return s.slice(0, 50);
}

/** Parse lat/lng from WP Rentals map embed (current listing pin). */
function parseMapPin(html: string): { latitude: number; longitude: number } | null {
  const m = html.match(/"single_marker":"\[\[\\"[\s\S]*?\\",(\d+\.\d+),(-?\d+\.\d+),/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function collectGalleryUrls($: cheerio.CheerioAPI): string[] {
  const imageUrls: string[] = [];
  const push = (href: string | undefined) => {
    if (!href || !href.includes("wp-content/uploads") || href.includes("site-icon")) return;
    if (/-60x60\.|-100x100\.|-300x300\.|-400x314\./i.test(href)) return;
    if (!imageUrls.includes(href)) imageUrls.push(href);
  };
  $('a[data-fancybox="website_rental_gallery"]').each((_, el) => {
    push($(el).attr("href"));
  });
  if (imageUrls.length < 2) {
    $('a[href*="wp-content/uploads/20"][rel*="fancybox"]').each((_, el) => {
      push($(el).attr("href"));
    });
  }
  const byBase = new Map<string, string>();
  for (const u of imageUrls) {
    const key = u.replace(/-\d+x\d+(?=\.(jpe?g|png|webp))/i, "").replace(/-scaled/i, "");
    const prev = byBase.get(key);
    if (!prev || prev.length < u.length) byBase.set(key, u);
  }
  return [...byBase.values()].slice(0, 20);
}

function amenityCategory(name: string): string {
  const n = name.toLowerCase();
  if (/pool|beach|garden|patio|balcony|parking|grill|yard|lanai/i.test(n)) return "Outdoor";
  if (/wifi|internet|tv|cable|wireless/i.test(n)) return "Utilities";
  if (/kitchen|dishwasher|dryer|washer|linens|towel|bed|bath|essentials/i.test(n)) return "Kitchen";
  if (/air|heating|smoke|climate|conditioner/i.test(n)) return "Climate";
  if (/gym|fitness|tennis|recreation/i.test(n)) return "Recreation";
  if (/elevator|hanger|family|kid/i.test(n)) return "Living";
  return "Other";
}

interface ScrapedListing {
  url: string;
  name: string;
  importExternalId: string | null;
  description: string;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number;
  squareFootage: number;
  type: "condo" | "house" | "villa";
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  neighborhood: string | null;
  images: string[];
  featureNames: string[];
  coords: { latitude: number; longitude: number } | null;
}

function parseDetailRow($: cheerio.CheerioAPI, className: string): string {
  const raw = $(`.listing_detail.${className}`).first().text().replace(/\s+/g, " ").trim();
  return raw;
}

async function scrapeListingPage(url: string): Promise<ScrapedListing | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const name = $("h1").first().text().trim();
    if (!name) return null;

    const idText = parseDetailRow($, "list_detail_prop_id").replace(/Property ID:\s*/i, "").trim();
    const importExternalId = /^\d+$/.test(idText) ? idText : null;

    let type: "condo" | "house" | "villa" = "condo";
    const typeLink = $('a[href*="/listings/"]').first().text().toLowerCase();
    if (typeLink.includes("house")) type = "house";
    else if (typeLink.includes("villa")) type = "villa";

    let bedrooms = 2;
    let bathrooms = 2;
    const brRaw = parseDetailRow($, "list_detail_prop_bedrooms").replace(/Bedrooms:\s*/i, "").trim();
    const baRaw = parseDetailRow($, "list_detail_prop_bathrooms").replace(/Bathrooms:\s*/i, "").trim();
    const brN = parseInt(brRaw, 10);
    const baN = parseInt(baRaw, 10);
    if (Number.isFinite(brN)) bedrooms = brN;
    if (Number.isFinite(baN)) bathrooms = baN;

    const priceRaw =
      parseDetailRow($, "list_detail_prop_price_per_night") ||
      parseDetailRow($, "list_detail_prop_price_per_night_");
    let pricePerNight = 100;
    const pm = priceRaw.match(/USD\s*([\d,.]+)/i) || priceRaw.match(/([\d,.]+)\s*\/\s*night/i);
    if (pm) pricePerNight = parseFloat(pm[1].replace(/,/g, ""));

    let squareFootage = 1100 + bedrooms * 80;
    const sizeRaw = parseDetailRow($, "list_detail_prop_size").replace(/Property\s*size:?\s*/i, "").trim();
    const sizeNum = parseInt(sizeRaw.replace(/,/g, ""), 10);
    if (Number.isFinite(sizeNum) && sizeNum >= 200) squareFootage = sizeNum;

    const streetFull = stripLabel(
      parseDetailRow($, "list_detail_prop_address"),
      /^Address:\s*/i
    );
    const city = stripLabel(parseDetailRow($, "list_detail_prop_city"), /^City:\s*/i).replace(/,.*/, "");
    const areaText = $(".list_detail_prop_area a").first().text().trim() || stripLabel(parseDetailRow($, "list_detail_prop_area"), /^Area:\s*/i);
    const stateRaw = stripLabel(parseDetailRow($, "list_detail_prop_state"), /^State:\s*/i);
    const zipCode = stripLabel(parseDetailRow($, "list_detail_prop_zip"), /^Zip:\s*/i).slice(0, 20);
    const countryRaw = stripLabel(parseDetailRow($, "list_detail_prop_contry"), /^Country:\s*/i) || "United States";

    let street = streetFull || areaText || "Address on file";
    if (city && street.toLowerCase().endsWith(`, ${city.toLowerCase()}`)) {
      street = street.slice(0, -(`, ${city}`.length)).trim();
    }
    street = street.slice(0, 200);
    const cityFinal = (city || "Naples").slice(0, 100);
    const state = normalizeState(stateRaw || "FL");
    const zipFinal = (zipCode || "34119").replace(/\s+/g, "").slice(0, 20);

    let description = "";
    $("h4, h3").each((_, el) => {
      const t = $(el).text().trim();
      if (/property description/i.test(t)) {
        let cur = $(el).next();
        const parts: string[] = [];
        let guard = 0;
        while (cur.length && guard++ < 15) {
          const tag = cur.prop("tagName")?.toLowerCase();
          if (tag === "h4" || tag === "h3") break;
          const text = cur.text().trim();
          if (text && !/^View more$/i.test(text)) parts.push(text);
          cur = cur.next();
        }
        description = parts.join("\n\n").slice(0, 2000);
      }
    });
    if (!description) {
      description =
        $('meta[property="og:description"]').attr("content")?.trim().slice(0, 2000) ||
        `${name} — imported from ${url}`.slice(0, 2000);
    }

    const images = collectGalleryUrls($);
    const featureNames: string[] = [];
    const seen = new Set<string>();
    $(
      ".features_wrapper li, .property_features li, ul.listing_features li, .amenities_list li, #carousel-listing li, .feature_block_others .listing_detail"
    ).each((_, el) => {
      const raw = $(el).clone().children().remove().end().text().replace(/\s+/g, " ").trim();
      if (raw.length > 1 && raw.length < 120 && !seen.has(raw.toLowerCase())) {
        seen.add(raw.toLowerCase());
        featureNames.push(raw);
      }
    });

    const coords = parseMapPin(html);

    return {
      url,
      name: name.slice(0, 200),
      importExternalId,
      description,
      bedrooms,
      bathrooms,
      pricePerNight,
      squareFootage,
      type,
      address: {
        street,
        city: cityFinal,
        state,
        zipCode: zipFinal,
        country: countryRaw.slice(0, 100),
      },
      neighborhood: areaText ? areaText.slice(0, 120) : null,
      images,
      featureNames: featureNames.slice(0, 45),
      coords,
    };
  } catch (e) {
    console.error(`   ⚠️  scrape failed ${url}:`, (e as Error).message);
    return null;
  }
}

function mapPropertyType(t: "condo" | "house" | "villa"): "condo" | "house" | "townhouse" {
  if (t === "house") return "house";
  if (t === "villa") return "townhouse";
  return "condo";
}

function unitTypeFor(t: "condo" | "house" | "villa"): "apartment" | "loft" | "penthouse" {
  if (t === "house") return "loft";
  if (t === "villa") return "penthouse";
  return "apartment";
}

function extractUnitCode(name: string): string {
  const m =
    name.match(/#\s*([A-Z]?\d+[A-Z]?)\s*$/i) ||
    name.match(/[–-]\s*#?\s*([A-Z]?\d+[A-Z]?)\s*$/i) ||
    name.match(/\b([CHV]\d{2,})\b/i);
  if (m) return m[1].toUpperCase().slice(0, 20);
  const slug = name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 16);
  return slug || "UNIT";
}

async function upsertOne(
  scraped: ScrapedListing,
  ownerId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId | undefined
): Promise<"created" | "updated" | "skipped"> {
  const unitCode = scraped.importExternalId || extractUnitCode(scraped.name);
  const propertyType = mapPropertyType(scraped.type);
  const uType = unitTypeFor(scraped.type);
  const monthlyRent = Math.max(0, Math.round(scraped.pricePerNight * 30));
  const amenities = scraped.featureNames.map((n) => ({
    name: n.slice(0, 100),
    category: amenityCategory(n),
  }));
  const imgs = scraped.images.length ? scraped.images.slice(0, 20) : [];

  const filter: mongoose.FilterQuery<typeof Property> = {
    importSource: VMS_SOURCE,
    $or: [
      { importListingUrl: scraped.url },
      { importListingUrl: `${scraped.url}/` },
      ...(scraped.importExternalId
        ? [{ importExternalId: scraped.importExternalId }]
        : []),
    ],
  };

  const existing = await Property.findOne(filter);

  const unitPatch = {
    unitNumber: unitCode,
    unitType: uType,
    floor: 1,
    bedrooms: scraped.bedrooms,
    bathrooms: scraped.bathrooms,
    squareFootage: Math.min(50000, Math.max(50, scraped.squareFootage)),
    rentAmount: monthlyRent,
    securityDeposit: Math.min(50000, Math.max(0, Math.round(monthlyRent * 0.5))),
    status: "available" as const,
    images: imgs.slice(0, 15),
    centralAir: true,
    dishwasher: scraped.featureNames.some((f) => /dishwasher/i.test(f)),
    inUnitLaundry: scraped.featureNames.some((f) => /washer|dryer|laundry/i.test(f)),
    balcony: scraped.featureNames.some((f) => /balcony|lanai|patio/i.test(f)),
    parking: {
      included: scraped.featureNames.some((f) => /parking/i.test(f)),
      spaces: 1,
      type: "open" as const,
    },
    appliances: {
      refrigerator: true,
      stove: true,
      oven: true,
      microwave: true,
      dishwasher: scraped.featureNames.some((f) => /dishwasher/i.test(f)),
      washer: scraped.featureNames.some((f) => /washer/i.test(f)),
      dryer: scraped.featureNames.some((f) => /dryer/i.test(f)),
    },
    utilities: {
      electricity: "tenant" as const,
      water: "included" as const,
      internet: scraped.featureNames.some((f) => /wifi|internet|wireless/i.test(f))
        ? ("included" as const)
        : ("tenant" as const),
      cable: "tenant" as const,
      trash: "included" as const,
    },
    notes: scraped.coords
      ? `Map: ${scraped.coords.latitude}, ${scraped.coords.longitude}`.slice(0, 1000)
      : undefined,
  };

  if (existing) {
    existing.name = scraped.name;
    existing.type = propertyType;
    existing.description = scraped.description;
    existing.address = scraped.address as (typeof existing)["address"];
    if (scraped.neighborhood) existing.neighborhood = scraped.neighborhood;
    existing.importSource = VMS_SOURCE;
    existing.importListingUrl = scraped.url;
    if (scraped.importExternalId) existing.importExternalId = scraped.importExternalId;
    if (imgs.length) existing.images = imgs;
    if (amenities.length) existing.amenities = amenities as (typeof existing)["amenities"];
    if (existing.units?.[0]) {
      Object.assign(existing.units[0], unitPatch);
      existing.markModified("units");
    }
    await existing.save();
    return "updated";
  }

  const doc = new Property({
    name: scraped.name,
    type: propertyType,
    description: scraped.description,
    address: scraped.address,
    neighborhood: scraped.neighborhood ?? undefined,
    importSource: VMS_SOURCE,
    importListingUrl: scraped.url,
    importExternalId: scraped.importExternalId ?? undefined,
    images: imgs.length ? imgs : [],
    ownerId,
    managerId,
    status: "available",
    isMultiUnit: false,
    totalUnits: 1,
    amenities:
      amenities.length > 0
        ? amenities
        : [{ name: "WiFi", category: "Utilities" }, { name: "Kitchen", category: "Kitchen" }],
    units: [unitPatch],
  });
  await doc.save();
  return "created";
}

async function runForUri(uri: string, label: string, urls: string[], ownerId: mongoose.Types.ObjectId, managerId?: mongoose.Types.ObjectId) {
  console.log(`\n── Database: ${label} ──`);
  await mongoose.disconnect().catch(() => {});
  await mongoose.connect(uri, { maxPoolSize: 8, serverSelectionTimeoutMS: 15000 });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`   [${i + 1}/${urls.length}] ${url.split("/").filter(Boolean).pop()}… `);
    const scraped = await scrapeListingPage(url);
    if (!scraped) {
      console.log("skip");
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`dry-run | ${scraped.address.street}, ${scraped.address.city} ${scraped.address.zipCode}`);
      continue;
    }
    try {
      const r = await upsertOne(scraped, ownerId, managerId);
      console.log(r === "created" ? "created" : r === "updated" ? "updated" : "skip");
      if (r === "created") created++;
      else if (r === "updated") updated++;
      else skipped++;
    } catch (e) {
      console.log("ERR", (e as Error).message);
      skipped++;
    }
    await new Promise((r) => setTimeout(r, 450));
  }

  await mongoose.disconnect();
  console.log(`   ${label}: ${created} created, ${updated} updated, ${skipped} skipped/failed`);
}

async function migrate() {
  const devUri = process.env.MONGODB_URI;
  const prodUri = process.env.MONGODB_URI_PRODUCTION;

  if (!DRY_RUN && !devUri) {
    throw new Error("MONGODB_URI is not defined in .env.local (or set DRY_RUN=1 to preview only).");
  }

  console.log("🌴 VMS Florida — advanced search → MongoDB");
  console.log(DRY_RUN ? "   (DRY_RUN: no writes)\n" : "\n");

  console.log("📥 Collecting listing URLs (paginated)…");
  const urls = await collectAllListingUrls();
  console.log(`   ${urls.length} unique listing URLs\n`);

  if (urls.length === 0) throw new Error("No property URLs found — check advanced search.");

  if (DRY_RUN) {
    for (const u of urls.slice(0, 3)) {
      const s = await scrapeListingPage(u);
      console.log("Sample:", s?.name, "|", s?.address.street, "|", s?.coords);
    }
    console.log("\nSet DRY_RUN=0 and MONGODB_URI to import all.");
    return;
  }

  await mongoose.connect(devUri!, { maxPoolSize: 5, serverSelectionTimeoutMS: 15000 });
  const ownerUser = await User.findOne({ email: "owner@smartstart.us" });
  const adminUser = await User.findOne({ email: "hi@smartstart.us" });
  if (!ownerUser && !adminUser) {
    await mongoose.disconnect();
    throw new Error("No owner@smartstart.us or hi@smartstart.us — run npm run seed:demo first.");
  }
  const ownerId = (ownerUser?._id || adminUser?._id) as mongoose.Types.ObjectId;
  const managerId = adminUser?._id as mongoose.Types.ObjectId | undefined;
  await mongoose.disconnect();

  await runForUri(devUri!, "development", urls, ownerId, managerId);

  if (prodUri) {
    await runForUri(prodUri, "production", urls, ownerId, managerId);
  } else {
    console.log("\n   (Skipping production: set MONGODB_URI_PRODUCTION in .env.local to sync prod too.)");
  }

  console.log("\n✅ Done.");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

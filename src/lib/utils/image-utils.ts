/**
 * SmartStartPM - Image Utilities
 * Utility functions for safe image handling and validation
 */

/**
 * Normalize a single image entry from API/DB (string URL or { url } from uploads).
 */
export function normalizeImageEntry(entry: unknown): string | null {
  if (typeof entry === "string") {
    const s = entry.trim();
    return s.length > 0 ? s : null;
  }
  if (entry && typeof entry === "object" && "url" in entry) {
    const u = (entry as { url: unknown }).url;
    if (typeof u === "string" && u.trim().length > 0) {
      return u.trim();
    }
  }
  return null;
}

function collectImageStrings(raw: unknown, logLabel: string): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    console.warn(
      `${logLabel}: expected array, got`,
      typeof raw,
      raw
    );
    return [];
  }

  const out: string[] = [];
  raw.forEach((item, index) => {
    const url = normalizeImageEntry(item);
    if (url) {
      out.push(url);
      return;
    }
    if (item !== undefined && item !== null && item !== "") {
      console.warn(
        `${logLabel}: Invalid image at index ${index}`,
        typeof item,
        item
      );
    }
  });
  return out;
}

/**
 * Safely get images array from property object
 * Handles undefined, null, and non-array cases
 */
export function getPropertyImages(property: any): string[] {
  // Handle completely undefined/null property
  if (!property || typeof property !== "object") {
    console.warn(
      "getPropertyImages: Invalid property object provided",
      property
    );
    return [];
  }

  const fromProperty = collectImageStrings(
    property.images,
    "getPropertyImages(property.images)"
  );

  if (fromProperty.length > 0) {
    return fromProperty;
  }

  // Property form often stores photos only on embedded units; use those for list thumbnails
  const units = property.units;
  if (!Array.isArray(units) || units.length === 0) {
    return [];
  }

  const fromUnits: string[] = [];
  for (const unit of units) {
    if (!unit || typeof unit !== "object") continue;
    const unitImages = collectImageStrings(
      unit.images,
      "getPropertyImages(unit.images)"
    );
    for (const url of unitImages) {
      fromUnits.push(url);
    }
  }

  return fromUnits;
}

/**
 * Get the featured image (first image) from property
 */
export function getFeaturedImage(property: any): string | null {
  const images = getPropertyImages(property);
  return images.length > 0 ? images[0] : null;
}

/**
 * Check if property has any valid images
 */
export function hasPropertyImages(property: any): boolean {
  return getPropertyImages(property).length > 0;
}

/**
 * Safely get images array from unit object
 * Prioritizes unit-specific images over property images
 */
export function getUnitImages(unit: any): string[] {
  if (!unit || typeof unit !== "object") {
    return [];
  }

  // First try unit-specific images
  const fromUnitImages = collectImageStrings(
    unit.unitImages,
    "getUnitImages(unitImages)"
  );
  if (fromUnitImages.length > 0) {
    return fromUnitImages;
  }

  const fromImages = collectImageStrings(unit.images, "getUnitImages(images)");
  if (fromImages.length > 0) {
    return fromImages;
  }

  // Fall back to property images (when unit object is a full property-shaped doc)
  return getPropertyImages(unit);
}

/**
 * Get the featured image (first image) from unit
 * Prioritizes unit-specific images over property images
 */
export function getFeaturedUnitImage(unit: any): string | null {
  const images = getUnitImages(unit);
  return images.length > 0 ? images[0] : null;
}

/**
 * Check if unit has any valid images (unit or property)
 */
export function hasUnitImages(unit: any): boolean {
  return getUnitImages(unit).length > 0;
}

/**
 * Get image count for property
 */
export function getImageCount(property: any): number {
  return getPropertyImages(property).length;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get placeholder image URL for properties without images
 */
export function getPlaceholderImage(): string {
  return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop";
}

/**
 * Get image with fallback to placeholder
 */
export function getImageWithFallback(property: any, index: number = 0): string {
  const images = getPropertyImages(property);

  if (images.length > index && isValidImageUrl(images[index])) {
    return images[index];
  }

  return getPlaceholderImage();
}

/**
 * Safe image mapping function that handles errors gracefully
 */
export function mapPropertyImages<T>(
  property: any,
  mapFn: (imageUrl: string, index: number) => T
): T[] {
  const images = getPropertyImages(property);

  return images.map((imageUrl, index) => {
    try {
      return mapFn(imageUrl, index);
    } catch (error) {
      console.error(`Error mapping image at index ${index}:`, error);
      // Return a default/fallback value - this depends on what T is
      // For now, we'll throw to let the caller handle it
      throw error;
    }
  });
}

/**
 * Optimize image URL for different display sizes
 */
export function optimizeImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "auto" | "webp" | "jpg" | "png";
  } = {}
): string {
  // Note: R2 doesn't support on-the-fly transformations
  // Images are pre-processed during upload using sharp
  // For now, we return the URL as-is
  // In production, you might want to use Cloudflare Images or implement a transformation API

  return url;
}

/**
 * Generate responsive image sizes for Next.js Image component
 */
export function getResponsiveSizes(
  breakpoints: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  } = {}
): string {
  const { mobile = "100vw", tablet = "50vw", desktop = "33vw" } = breakpoints;

  return `(max-width: 768px) ${mobile}, (max-width: 1200px) ${tablet}, ${desktop}`;
}

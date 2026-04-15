export type BookingDiscountTierKey = "weekly" | "monthly" | "bimonthly";

export interface BookingDiscountTier {
  enabled: boolean;
  minNights: number;
  percent: number;
  label: string;
}

export interface BookingDiscountSettings {
  weekly: BookingDiscountTier;
  monthly: BookingDiscountTier;
  bimonthly: BookingDiscountTier;
}

export const DEFAULT_BOOKING_DISCOUNTS: BookingDiscountSettings = {
  weekly: {
    enabled: true,
    minNights: 7,
    percent: 5,
    label: "Weekly stay discount",
  },
  monthly: {
    enabled: true,
    minNights: 30,
    percent: 10,
    label: "Monthly stay discount",
  },
  bimonthly: {
    enabled: true,
    minNights: 60,
    percent: 15,
    label: "Bi-monthly stay discount",
  },
};

function normalizeTier(
  tier: Partial<BookingDiscountTier> | undefined,
  fallback: BookingDiscountTier
): BookingDiscountTier {
  return {
    enabled: tier?.enabled ?? fallback.enabled,
    minNights: Math.max(1, Number(tier?.minNights ?? fallback.minNights)),
    percent: Math.max(0, Math.min(100, Number(tier?.percent ?? fallback.percent))),
    label: String(tier?.label ?? fallback.label).trim() || fallback.label,
  };
}

export function normalizeBookingDiscountSettings(
  value?: Partial<BookingDiscountSettings> | null
): BookingDiscountSettings {
  return {
    weekly: normalizeTier(value?.weekly, DEFAULT_BOOKING_DISCOUNTS.weekly),
    monthly: normalizeTier(value?.monthly, DEFAULT_BOOKING_DISCOUNTS.monthly),
    bimonthly: normalizeTier(value?.bimonthly, DEFAULT_BOOKING_DISCOUNTS.bimonthly),
  };
}

export function getApplicableBookingDiscount(
  nights: number,
  settings: BookingDiscountSettings
): (BookingDiscountTier & { key: BookingDiscountTierKey }) | null {
  const ordered: Array<BookingDiscountTierKey> = ["bimonthly", "monthly", "weekly"];

  for (const key of ordered) {
    const tier = settings[key];
    if (tier.enabled && nights >= tier.minNights && tier.percent > 0) {
      return { key, ...tier };
    }
  }

  return null;
}

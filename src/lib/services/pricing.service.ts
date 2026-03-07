import {
  IPricingRule,
  PricingRuleType,
  IDiscountApplied,
} from "@/types";

export interface PriceCalculationInput {
  baseRentPerNight: number;
  startDate: Date;
  endDate: Date;
  pricingRules: IPricingRule[];
  bookingDate?: Date;
}

export interface DayPrice {
  date: string;
  basePrice: number;
  effectivePrice: number;
  appliedRule?: string;
  ruleType?: string;
}

export interface PriceCalculationResult {
  totalNights: number;
  basePrice: number;
  calculatedPrice: number;
  dailyBreakdown: DayPrice[];
  discountsApplied: IDiscountApplied[];
  minimumStay?: number;
  maximumStay?: number;
  averagePricePerNight: number;
}

function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return d >= s && d < e;
}

export function calculatePrice(input: PriceCalculationInput): PriceCalculationResult {
  const { baseRentPerNight, startDate, endDate, pricingRules, bookingDate } = input;
  const totalNights = getDaysBetween(startDate, endDate);
  const basePrice = totalNights * baseRentPerNight;
  const today = bookingDate || new Date();

  const activeRules = pricingRules
    .filter((r) => r.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const dailyBreakdown: DayPrice[] = [];
  let subtotal = 0;
  let effectiveMinStay: number | undefined;
  let effectiveMaxStay: number | undefined;

  for (let i = 0; i < totalNights; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    currentDate.setHours(0, 0, 0, 0);
    const dayOfWeek = currentDate.getDay();

    let dayPrice = baseRentPerNight;
    let appliedRuleName: string | undefined;
    let appliedRuleType: string | undefined;

    for (const rule of activeRules) {
      let matches = false;

      switch (rule.ruleType) {
        case PricingRuleType.DAILY_OVERRIDE:
          if (rule.startDate && rule.endDate) {
            matches = isDateInRange(currentDate, rule.startDate, rule.endDate);
          }
          break;

        case PricingRuleType.HOLIDAY:
          if (rule.startDate && rule.endDate) {
            matches = isDateInRange(currentDate, rule.startDate, rule.endDate);
          }
          break;

        case PricingRuleType.SEASONAL:
          if (rule.startDate && rule.endDate) {
            matches = isDateInRange(currentDate, rule.startDate, rule.endDate);
          }
          break;

        case PricingRuleType.WEEKEND:
          if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            matches = rule.daysOfWeek.includes(dayOfWeek);
          } else {
            matches = dayOfWeek === 0 || dayOfWeek === 6;
          }
          break;

        case PricingRuleType.WEEKDAY:
          if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
            matches = rule.daysOfWeek.includes(dayOfWeek);
          } else {
            matches = dayOfWeek >= 1 && dayOfWeek <= 5;
          }
          break;

        case PricingRuleType.LAST_MINUTE:
          if (rule.lastMinutePricing?.enabled && rule.lastMinutePricing.daysBeforeCheckIn) {
            const daysUntilCheckIn = getDaysBetween(today, startDate);
            matches = daysUntilCheckIn <= rule.lastMinutePricing.daysBeforeCheckIn && i === 0;
          }
          break;
      }

      if (matches) {
        if (rule.pricePerNight !== undefined && rule.pricePerNight !== null) {
          dayPrice = rule.pricePerNight;
        } else if (rule.priceModifier) {
          if (rule.priceModifier.type === "fixed") {
            dayPrice = baseRentPerNight + rule.priceModifier.value;
          } else if (rule.priceModifier.type === "percentage") {
            dayPrice = baseRentPerNight * (1 + rule.priceModifier.value / 100);
          }
        }

        if (rule.ruleType === PricingRuleType.LAST_MINUTE && rule.lastMinutePricing?.modifier) {
          if (rule.lastMinutePricing.modifier.type === "percentage") {
            dayPrice = baseRentPerNight * (1 + rule.lastMinutePricing.modifier.value / 100);
          } else {
            dayPrice = baseRentPerNight + rule.lastMinutePricing.modifier.value;
          }
        }

        appliedRuleName = rule.name;
        appliedRuleType = rule.ruleType;

        if (rule.minimumStay) {
          effectiveMinStay = effectiveMinStay
            ? Math.max(effectiveMinStay, rule.minimumStay)
            : rule.minimumStay;
        }
        if (rule.maximumStay) {
          effectiveMaxStay = effectiveMaxStay
            ? Math.min(effectiveMaxStay, rule.maximumStay)
            : rule.maximumStay;
        }

        break;
      }
    }

    dayPrice = Math.max(0, Math.round(dayPrice * 100) / 100);
    subtotal += dayPrice;

    dailyBreakdown.push({
      date: currentDate.toISOString().split("T")[0],
      basePrice: baseRentPerNight,
      effectivePrice: dayPrice,
      appliedRule: appliedRuleName,
      ruleType: appliedRuleType,
    });
  }

  const discountsApplied: IDiscountApplied[] = [];

  const daysAhead = getDaysBetween(today, startDate);
  for (const rule of activeRules) {
    if (
      rule.ruleType === PricingRuleType.EARLY_BIRD_DISCOUNT &&
      rule.advanceBookingDiscounts &&
      rule.advanceBookingDiscounts.length > 0
    ) {
      const sortedDiscounts = [...rule.advanceBookingDiscounts].sort(
        (a, b) => b.daysAhead - a.daysAhead
      );
      for (const discount of sortedDiscounts) {
        if (daysAhead >= discount.daysAhead) {
          const amount = Math.round(subtotal * (discount.discountPercent / 100) * 100) / 100;
          subtotal -= amount;
          discountsApplied.push({
            type: "early_bird",
            label: `Early bird discount (${discount.daysAhead}+ days ahead)`,
            percentage: discount.discountPercent,
            amount,
          });
          break;
        }
      }
    }
  }

  for (const rule of activeRules) {
    if (rule.ruleType === PricingRuleType.LONG_TERM_DISCOUNT && rule.longTermDiscount) {
      if (totalNights >= 30 && rule.longTermDiscount.monthlyPercent) {
        const amount =
          Math.round(subtotal * (rule.longTermDiscount.monthlyPercent / 100) * 100) / 100;
        subtotal -= amount;
        discountsApplied.push({
          type: "long_term_monthly",
          label: `Monthly stay discount (${totalNights} nights)`,
          percentage: rule.longTermDiscount.monthlyPercent,
          amount,
        });
      } else if (totalNights >= 7 && rule.longTermDiscount.weeklyPercent) {
        const amount =
          Math.round(subtotal * (rule.longTermDiscount.weeklyPercent / 100) * 100) / 100;
        subtotal -= amount;
        discountsApplied.push({
          type: "long_term_weekly",
          label: `Weekly stay discount (${totalNights} nights)`,
          percentage: rule.longTermDiscount.weeklyPercent,
          amount,
        });
      }
    }
  }

  const calculatedPrice = Math.max(0, Math.round(subtotal * 100) / 100);

  return {
    totalNights,
    basePrice: Math.round(basePrice * 100) / 100,
    calculatedPrice,
    dailyBreakdown,
    discountsApplied,
    minimumStay: effectiveMinStay,
    maximumStay: effectiveMaxStay,
    averagePricePerNight:
      totalNights > 0 ? Math.round((calculatedPrice / totalNights) * 100) / 100 : 0,
  };
}

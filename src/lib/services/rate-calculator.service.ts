import { PropertyPricing } from "@/models";
import { IPropertyPricing, IPricingDiscount } from "@/models/PropertyPricing";

export interface RateCalculationResult {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  baseTotal: number;
  weekdayTotal: number;
  weekendTotal: number;
  subtotal: number;
  discount: {
    applied: boolean;
    type?: "percentage" | "fixed";
    value?: number;
    label?: string;
    amount: number;
  };
  fees: {
    cleaning: number;
    service: number;
  };
  total: number;
  averageNightlyRate: number;
  currency: string;
  breakdown: RateBreakdownItem[];
}

export interface RateBreakdownItem {
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  rate: number;
  rateType: "weekday" | "weekend" | "seasonal" | "base";
  seasonalLabel?: string;
}

export interface DateRange {
  checkIn: Date;
  checkOut: Date;
}

class RateCalculatorService {
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 5 || day === 6 || day === 0;
  }

  private getDaysBetween(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (current < end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  async getPricingForProperty(
    propertyId: string,
    unitId?: string
  ): Promise<IPropertyPricing | null> {
    const query: any = { propertyId, isActive: true };
    if (unitId) {
      query.unitId = unitId;
    }
    
    return await PropertyPricing.findOne(query);
  }

  getEffectiveRate(
    pricing: IPropertyPricing,
    date: Date
  ): { rate: number; type: "weekday" | "weekend" | "seasonal" | "base"; seasonalLabel?: string } {
    const seasonalRate = pricing.seasonalRates?.find(sr => 
      date >= sr.startDate && date <= sr.endDate
    );
    
    if (seasonalRate) {
      return {
        rate: seasonalRate.rate,
        type: "seasonal",
        seasonalLabel: seasonalRate.label,
      };
    }
    
    if (this.isWeekend(date)) {
      return {
        rate: pricing.weekendRate ?? pricing.baseRate,
        type: pricing.weekendRate ? "weekend" : "base",
      };
    }
    
    return {
      rate: pricing.weekdayRate ?? pricing.baseRate,
      type: pricing.weekdayRate ? "weekday" : "base",
    };
  }

  applyDiscount(
    subtotal: number,
    nights: number,
    discounts: IPricingDiscount[]
  ): { amount: number; applied: IPricingDiscount | null } {
    if (!discounts || discounts.length === 0) {
      return { amount: 0, applied: null };
    }
    
    const sortedDiscounts = [...discounts].sort((a, b) => b.minDays - a.minDays);
    const applicableDiscount = sortedDiscounts.find(d => nights >= d.minDays);
    
    if (!applicableDiscount) {
      return { amount: 0, applied: null };
    }
    
    let discountAmount: number;
    if (applicableDiscount.discountType === "percentage") {
      discountAmount = subtotal * (applicableDiscount.value / 100);
    } else {
      discountAmount = applicableDiscount.value;
    }
    
    return { amount: Math.min(discountAmount, subtotal), applied: applicableDiscount };
  }

  async calculateStayRate(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    unitId?: string
  ): Promise<RateCalculationResult | null> {
    const pricing = await this.getPricingForProperty(propertyId, unitId);
    
    if (!pricing) {
      return null;
    }
    
    return this.calculateFromPricing(pricing, checkIn, checkOut);
  }

  calculateFromPricing(
    pricing: IPropertyPricing,
    checkIn: Date,
    checkOut: Date
  ): RateCalculationResult {
    const dates = this.getDaysBetween(checkIn, checkOut);
    const nights = dates.length;
    
    if (nights === 0) {
      return {
        nights: 0,
        weekdayNights: 0,
        weekendNights: 0,
        baseTotal: 0,
        weekdayTotal: 0,
        weekendTotal: 0,
        subtotal: 0,
        discount: { applied: false, amount: 0 },
        fees: { cleaning: 0, service: 0 },
        total: 0,
        averageNightlyRate: 0,
        currency: pricing.currency,
        breakdown: [],
      };
    }
    
    let weekdayNights = 0;
    let weekendNights = 0;
    let weekdayTotal = 0;
    let weekendTotal = 0;
    const breakdown: RateBreakdownItem[] = [];
    
    for (const date of dates) {
      const { rate, type, seasonalLabel } = this.getEffectiveRate(pricing, date);
      const isWeekend = this.isWeekend(date);
      
      breakdown.push({
        date,
        dayOfWeek: date.getDay(),
        isWeekend,
        rate,
        rateType: type,
        seasonalLabel,
      });
      
      if (isWeekend) {
        weekendNights++;
        weekendTotal += rate;
      } else {
        weekdayNights++;
        weekdayTotal += rate;
      }
    }
    
    const subtotal = weekdayTotal + weekendTotal;
    
    const { amount: discountAmount, applied: appliedDiscount } = this.applyDiscount(
      subtotal,
      nights,
      pricing.discounts
    );
    
    const cleaningFee = pricing.cleaningFee ?? 0;
    const serviceFee = pricing.serviceFee ?? 0;
    
    const total = subtotal - discountAmount + cleaningFee + serviceFee;
    
    return {
      nights,
      weekdayNights,
      weekendNights,
      baseTotal: pricing.baseRate * nights,
      weekdayTotal,
      weekendTotal,
      subtotal,
      discount: {
        applied: !!appliedDiscount,
        type: appliedDiscount?.discountType,
        value: appliedDiscount?.value,
        label: appliedDiscount?.label,
        amount: discountAmount,
      },
      fees: {
        cleaning: cleaningFee,
        service: serviceFee,
      },
      total,
      averageNightlyRate: nights > 0 ? (total - cleaningFee - serviceFee) / nights : 0,
      currency: pricing.currency,
      breakdown,
    };
  }

  async getEffectiveRateForDate(
    propertyId: string,
    date: Date,
    unitId?: string
  ): Promise<number | null> {
    const pricing = await this.getPricingForProperty(propertyId, unitId);
    
    if (!pricing) {
      return null;
    }
    
    const { rate } = this.getEffectiveRate(pricing, date);
    return rate;
  }

  validateStayDuration(
    pricing: IPropertyPricing,
    nights: number
  ): { valid: boolean; message?: string } {
    if (pricing.minimumStay && nights < pricing.minimumStay) {
      return {
        valid: false,
        message: `Minimum stay is ${pricing.minimumStay} night${pricing.minimumStay > 1 ? "s" : ""}`,
      };
    }
    
    if (pricing.maximumStay && nights > pricing.maximumStay) {
      return {
        valid: false,
        message: `Maximum stay is ${pricing.maximumStay} night${pricing.maximumStay > 1 ? "s" : ""}`,
      };
    }
    
    return { valid: true };
  }

  formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  generateQuote(result: RateCalculationResult): string {
    const lines: string[] = [
      `Stay Summary (${result.nights} night${result.nights !== 1 ? "s" : ""})`,
      "─".repeat(40),
    ];
    
    if (result.weekdayNights > 0 && result.weekendNights > 0) {
      lines.push(`Weekday nights (${result.weekdayNights}): ${this.formatCurrency(result.weekdayTotal, result.currency)}`);
      lines.push(`Weekend nights (${result.weekendNights}): ${this.formatCurrency(result.weekendTotal, result.currency)}`);
    }
    
    lines.push(`Subtotal: ${this.formatCurrency(result.subtotal, result.currency)}`);
    
    if (result.discount.applied) {
      lines.push(`${result.discount.label}: -${this.formatCurrency(result.discount.amount, result.currency)}`);
    }
    
    if (result.fees.cleaning > 0) {
      lines.push(`Cleaning fee: ${this.formatCurrency(result.fees.cleaning, result.currency)}`);
    }
    
    if (result.fees.service > 0) {
      lines.push(`Service fee: ${this.formatCurrency(result.fees.service, result.currency)}`);
    }
    
    lines.push("─".repeat(40));
    lines.push(`Total: ${this.formatCurrency(result.total, result.currency)}`);
    lines.push(`Average nightly rate: ${this.formatCurrency(result.averageNightlyRate, result.currency)}`);
    
    return lines.join("\n");
  }
}

export const rateCalculatorService = new RateCalculatorService();
export default rateCalculatorService;

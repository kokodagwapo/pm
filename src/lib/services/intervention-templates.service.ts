/**
 * Intervention Template Service
 *
 * Single source of truth for retention offer templates.
 * Merges manager-configurable DB templates with built-in defaults.
 * Used by: /api/tenant-intelligence/intervention, /api/tenant-intelligence/cron,
 *           /api/tenant-intelligence/templates
 */

import connectDB from "@/lib/mongodb";

export interface InterventionTemplate {
  id: string;
  label: string;
  message: string;
  isBuiltIn: boolean;
}

export const BUILT_IN_TEMPLATES: InterventionTemplate[] = [
  {
    id: "rent_freeze",
    label: "1-Month Rent Freeze",
    message:
      "We value your tenancy and would like to offer you a 1-month rent freeze as a gesture of appreciation. Your rent will remain unchanged for the next month — no action needed.",
    isBuiltIn: true,
  },
  {
    id: "parking_upgrade",
    label: "Parking Upgrade",
    message:
      "As a valued long-term resident, we'd like to offer you a complimentary parking space upgrade. Please contact us to arrange the details.",
    isBuiltIn: true,
  },
  {
    id: "appliance_credit",
    label: "$200 Appliance Upgrade Credit",
    message:
      "We're offering you a $200 appliance upgrade credit redeemable within the next 30 days. Contact your property manager to apply it to an eligible appliance upgrade.",
    isBuiltIn: true,
  },
  {
    id: "checkin",
    label: "Personal Check-In",
    message:
      "Your property manager would like to schedule a brief check-in call to make sure everything is going well. Please reply to let us know a convenient time.",
    isBuiltIn: true,
  },
  {
    id: "payment_plan",
    label: "Flexible Payment Plan",
    message:
      "We understand circumstances can change. We'd like to discuss a flexible payment arrangement to help you stay on track. Please reach out at your earliest convenience.",
    isBuiltIn: true,
  },
];

const BUILT_IN_MAP = new Map(BUILT_IN_TEMPLATES.map((t) => [t.id, t]));

/** Get all templates (built-in + manager-created custom templates from DB) */
export async function getAllTemplates(): Promise<InterventionTemplate[]> {
  try {
    await connectDB();
    const InterventionTemplate = (await import("@/models/InterventionTemplate")).default;
    const custom = await InterventionTemplate.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();

    const customTemplates: InterventionTemplate[] = custom.map((t) => ({
      id: (t as unknown as { _id: { toString(): string } })._id.toString(),
      label: (t as unknown as { label: string }).label,
      message: (t as unknown as { message: string }).message,
      isBuiltIn: false,
    }));

    return [...BUILT_IN_TEMPLATES, ...customTemplates];
  } catch {
    return [...BUILT_IN_TEMPLATES];
  }
}

/** Get a single template by ID (checks built-ins first, then DB) */
export async function getTemplateById(id: string): Promise<InterventionTemplate | null> {
  if (BUILT_IN_MAP.has(id)) return BUILT_IN_MAP.get(id)!;

  try {
    await connectDB();
    const mongoose = (await import("mongoose")).default;
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const InterventionTemplate = (await import("@/models/InterventionTemplate")).default;
    const t = await InterventionTemplate.findOne({ _id: id, deletedAt: null }).lean();
    if (!t) return null;
    return {
      id,
      label: (t as unknown as { label: string }).label,
      message: (t as unknown as { message: string }).message,
      isBuiltIn: false,
    };
  } catch {
    return null;
  }
}

/**
 * Select the most appropriate template ID based on tenant risk signals.
 * Delinquency risk → payment_plan; lease expiring → checkin; else → checkin.
 */
export function selectTemplateForSignals(signals: {
  delinquencyHigh: boolean;
  leaseExpiringSoon: boolean;
}): string {
  if (signals.delinquencyHigh) return "payment_plan";
  if (signals.leaseExpiringSoon) return "checkin";
  return "checkin";
}

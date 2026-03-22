export const DEMO_LEAD_STORAGE_KEY = "smartstart_demo_lead_v1";

export interface DemoLead {
  fullName: string;
  phone: string;
  email: string;
  savedAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDemoLead(value: unknown): value is DemoLead {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.fullName !== "string" || typeof o.phone !== "string" || typeof o.email !== "string")
    return false;
  if (typeof o.savedAt !== "number" || !Number.isFinite(o.savedAt)) return false;
  return validateDemoLeadFields({
    fullName: o.fullName,
    phone: o.phone,
    email: o.email,
  });
}

export function validateDemoLeadFields(input: {
  fullName: string;
  phone: string;
  email: string;
}): boolean {
  const name = input.fullName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) return false;
  if (phone.length < 7) return false;
  if (!EMAIL_RE.test(email)) return false;
  return true;
}

export type DemoLeadFieldError = "name" | "phone" | "email" | null;

export function getDemoLeadFieldError(input: {
  fullName: string;
  phone: string;
  email: string;
}): DemoLeadFieldError {
  if (input.fullName.trim().length < 2) return "name";
  if (input.phone.trim().length < 7) return "phone";
  if (!EMAIL_RE.test(input.email.trim())) return "email";
  return null;
}

export function getDemoLead(): DemoLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDemoLead(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDemoLead(input: { fullName: string; phone: string; email: string }): DemoLead {
  const lead: DemoLead = {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    savedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_LEAD_STORAGE_KEY, JSON.stringify(lead));
  }
  return lead;
}

export function clearDemoLead(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_LEAD_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

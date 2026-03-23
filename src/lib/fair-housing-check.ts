/**
 * Fair Housing Language Checker
 * Shared utility for detecting discriminatory language in messages and announcements.
 * Returns early (non-blocking) warnings for high/medium issues,
 * and a hard block for critical violations if requested.
 */

export interface FairHousingIssue {
  matched: string;
  warning: string;
  severity: "critical" | "high" | "medium";
}

const PROTECTED_TERMS_PATTERNS: Array<{
  pattern: RegExp;
  warning: string;
  severity: "critical" | "high" | "medium";
}> = [
  {
    pattern: /\b(no children|no kids|adults only|child-?free)\b/i,
    warning: "Familial status discrimination — mentioning children or family composition is prohibited",
    severity: "critical",
  },
  {
    pattern: /\b(no section 8|no housing vouchers|no hud)\b/i,
    warning: "Source of income discrimination — may violate local laws",
    severity: "high",
  },
  {
    pattern: /\b(christian|jewish|muslim|catholic|protestant|buddhist|hindu)\b/i,
    warning: "Religion mention — advertising based on religion is prohibited",
    severity: "critical",
  },
  {
    pattern: /\b(american only|english-?speaking only|must speak english)\b/i,
    warning: "National origin discrimination — language requirements may violate fair housing",
    severity: "critical",
  },
  {
    pattern: /\b(able-?bodied|no disabilities|healthy only)\b/i,
    warning: "Disability discrimination — excluding people based on disability is prohibited",
    severity: "critical",
  },
  {
    pattern: /\b(male only|female only|men only|women only|ladies only)\b/i,
    warning: "Sex discrimination — sex-based restrictions are prohibited",
    severity: "critical",
  },
];

export function checkFairHousing(text: string): {
  issues: FairHousingIssue[];
  hasCritical: boolean;
  isCompliant: boolean;
} {
  const issues: FairHousingIssue[] = [];

  for (const { pattern, warning, severity } of PROTECTED_TERMS_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      issues.push({ matched: match[0], warning, severity });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  return { issues, hasCritical, isCompliant: issues.length === 0 };
}

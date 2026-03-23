import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_TERMS_PATTERNS: Array<{ pattern: RegExp; warning: string; severity: "critical" | "high" | "medium" }> = [
  { pattern: /\b(no children|no kids|adults only|child-?free)\b/i, warning: "Familial status discrimination — mentioning children or family composition is prohibited", severity: "critical" },
  { pattern: /\b(no section 8|no housing vouchers|no hud)\b/i, warning: "Source of income discrimination — may violate local laws in many jurisdictions", severity: "high" },
  { pattern: /\b(christian|jewish|muslim|catholic|protestant|buddhist|hindu)\b/i, warning: "Religion mention — advertising based on religion is prohibited", severity: "critical" },
  { pattern: /\b(american|english-?speaking|must speak english)\b/i, warning: "National origin discrimination — language requirements may violate fair housing", severity: "critical" },
  { pattern: /\b(mature|senior|retiree|over 55|55\+|age 55)\b/i, warning: "Age preference — only permitted in qualifying senior housing communities", severity: "high" },
  { pattern: /\b(able-?bodied|no disabilities|healthy)\b/i, warning: "Disability discrimination — excluding people based on disability is prohibited", severity: "critical" },
  { pattern: /\b(male only|female only|men only|women only|ladies only)\b/i, warning: "Sex discrimination — sex-based restrictions are prohibited (except shared housing exemptions)", severity: "critical" },
  { pattern: /\b(nice neighborhood|exclusive|executive)\b/i, warning: "Potentially discriminatory language that may imply racial exclusion", severity: "medium" },
  { pattern: /\b(bachelor|bachelor pad|single person)\b/i, warning: "Occupancy limits based on family status — use objective standards instead", severity: "medium" },
  { pattern: /\b(quiet neighborhood|safe area)\b/i, warning: "Phrases like 'quiet' or 'safe' may code for racial composition — use factual descriptions", severity: "medium" },
];

const RECOMMENDED_LANGUAGE: Record<string, string> = {
  "no children": "Occupancy is 2 persons per bedroom",
  "no section 8": "We accept all legal sources of income",
  "adults only": "This property has [X]-bedroom units",
  "english only": "Applications are accepted from all qualified applicants",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, context } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const issues: Array<{
      matched: string;
      warning: string;
      severity: "critical" | "high" | "medium";
      recommendation?: string;
    }> = [];

    for (const { pattern, warning, severity } of PROTECTED_TERMS_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const matched = match[0];
        const recommendation = RECOMMENDED_LANGUAGE[matched.toLowerCase()];
        issues.push({ matched, warning, severity, recommendation });
      }
    }

    const hasCritical = issues.some((i) => i.severity === "critical");
    const hasHigh = issues.some((i) => i.severity === "high");

    const generalRecommendations = [
      "Focus on property features, not tenant characteristics",
      "Use objective qualification criteria (income 3x rent, credit score, rental history)",
      "Apply the same screening criteria to all applicants",
      "Keep records of all applicant interactions and decisions",
    ];

    if (hasCritical) {
      generalRecommendations.unshift("URGENT: Critical fair housing violations detected — revise before publishing");
    }

    return NextResponse.json({
      text,
      issues,
      isCompliant: issues.length === 0,
      riskLevel: hasCritical ? "critical" : hasHigh ? "high" : issues.length > 0 ? "medium" : "none",
      generalRecommendations,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error analyzing fair housing compliance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

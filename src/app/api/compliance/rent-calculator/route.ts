export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import JurisdictionRule from "@/models/JurisdictionRule";

interface RentCalculation {
  currentRent: number;
  proposedIncrease: number;
  proposedIncreasePercent: number;
  newRent: number;
  stateCode: string;
  jurisdictionRule?: {
    title: string;
    maxRentIncreasePercent?: number;
    rentControlled: boolean;
    noticePeriodDays?: number;
    description: string;
  };
  compliance: {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
    requiredNoticeDays: number;
    effectiveDate: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const {
      currentRent,
      proposedNewRent,
      stateCode,
      noticeDays = 30,
      effectiveDate,
    } = await request.json();

    if (!currentRent || !proposedNewRent || !stateCode) {
      return NextResponse.json(
        { error: "currentRent, proposedNewRent, and stateCode are required" },
        { status: 400 }
      );
    }

    const proposedIncrease = proposedNewRent - currentRent;
    const proposedIncreasePercent = (proposedIncrease / currentRent) * 100;

    const rentRule = await JurisdictionRule.findOne({
      stateCode: stateCode.toUpperCase(),
      category: "rent_control",
      isActive: true,
    }).lean();

    const noticePeriodRule = await JurisdictionRule.findOne({
      stateCode: stateCode.toUpperCase(),
      category: "notice_requirements",
      isActive: true,
    }).lean();

    const issues: string[] = [];
    const recommendations: string[] = [];
    let isCompliant = true;

    const requiredNoticeDays = rentRule?.noticePeriodDays || noticePeriodRule?.noticePeriodDays || 30;

    if (noticeDays < requiredNoticeDays) {
      isCompliant = false;
      issues.push(`Notice period of ${noticeDays} days is less than required ${requiredNoticeDays} days in ${stateCode}`);
    }

    if (rentRule?.maxRentIncreasePercent && proposedIncreasePercent > rentRule.maxRentIncreasePercent) {
      isCompliant = false;
      issues.push(
        `Proposed increase of ${proposedIncreasePercent.toFixed(1)}% exceeds maximum allowed ${rentRule.maxRentIncreasePercent}% in ${stateCode}`
      );
    }

    if (proposedIncreasePercent > 10) {
      recommendations.push("Consider phasing large rent increases to minimize tenant disputes");
    }

    if (requiredNoticeDays > 30) {
      recommendations.push(`${stateCode} requires ${requiredNoticeDays} days notice for rent increases`);
    }

    if (rentRule?.rentControlled) {
      recommendations.push("This jurisdiction has rent control — verify current allowable increase with local housing authority");
    }

    const calcEffectiveDate = effectiveDate
      ? new Date(effectiveDate)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + requiredNoticeDays);
          return d;
        })();

    const result: RentCalculation = {
      currentRent,
      proposedIncrease,
      proposedIncreasePercent,
      newRent: proposedNewRent,
      stateCode: stateCode.toUpperCase(),
      jurisdictionRule: rentRule
        ? {
            title: rentRule.title,
            maxRentIncreasePercent: rentRule.maxRentIncreasePercent,
            rentControlled: rentRule.rentControlled,
            noticePeriodDays: rentRule.noticePeriodDays,
            description: rentRule.description,
          }
        : undefined,
      compliance: {
        isCompliant,
        issues,
        recommendations,
        requiredNoticeDays,
        effectiveDate: calcEffectiveDate.toISOString(),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating rent increase:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

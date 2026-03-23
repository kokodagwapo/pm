import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import JurisdictionRule from "@/models/JurisdictionRule";

interface SessionUser {
  id: string;
  role: string;
}

export interface EvictionStep {
  step: number;
  title: string;
  description: string;
  daysFromStart: number;
  requiredDocuments: string[];
  legalRequirements: string[];
  warnings: string[];
}

export interface EvictionWorkflow {
  stateCode: string;
  reason: string;
  steps: EvictionStep[];
  totalTimelineDays: number;
  jurisdictionNotes: string[];
  fairHousingWarnings: string[];
  recommendedAttorney: boolean;
}

const EVICTION_WORKFLOWS: Record<string, Partial<EvictionWorkflow>> = {
  FL: {
    steps: [
      {
        step: 1,
        title: "Written Notice to Tenant",
        description: "Serve a written notice to the tenant stating the reason and cure period",
        daysFromStart: 0,
        requiredDocuments: ["Notice to Pay Rent or Quit", "Proof of service"],
        legalRequirements: ["3-day notice for non-payment", "7-day notice for lease violations", "Must be served in person or posted on door with mailing copy"],
        warnings: ["Notice must comply with Florida Statute 83.56"],
      },
      {
        step: 2,
        title: "File Eviction Complaint",
        description: "If tenant does not comply, file eviction complaint with county court",
        daysFromStart: 4,
        requiredDocuments: ["Eviction complaint form", "Copy of lease", "Copy of notice served", "Filing fee (~$185-$400)"],
        legalRequirements: ["File in county where property is located", "Pay required court filing fees"],
        warnings: ["Do not attempt self-help eviction (changing locks, removing belongings)"],
      },
      {
        step: 3,
        title: "Court Summons Served",
        description: "Court issues summons, sheriff serves tenant",
        daysFromStart: 10,
        requiredDocuments: ["Summons from court"],
        legalRequirements: ["Tenant has 5 business days to respond after service"],
        warnings: ["Tenant may contest the eviction"],
      },
      {
        step: 4,
        title: "Default Judgment or Hearing",
        description: "If no response, request default judgment. If contested, attend hearing",
        daysFromStart: 18,
        requiredDocuments: ["Motion for default", "Writ of possession"],
        legalRequirements: ["Landlord must appear at hearing", "Bring all documentation"],
        warnings: ["Judge may grant tenant additional time"],
      },
      {
        step: 5,
        title: "Writ of Possession",
        description: "Sheriff enforces writ and removes tenant",
        daysFromStart: 26,
        requiredDocuments: ["Writ of possession"],
        legalRequirements: ["Sheriff provides 24-hour notice before removal"],
        warnings: ["Store tenant belongings per Florida law"],
      },
    ],
    totalTimelineDays: 30,
  },
  CA: {
    steps: [
      {
        step: 1,
        title: "Serve Notice",
        description: "Serve written notice to tenant",
        daysFromStart: 0,
        requiredDocuments: ["3-Day Notice to Pay Rent or Quit", "Proof of service"],
        legalRequirements: ["3 days for non-payment", "3 days for lease violations", "30/60/90 days for no-fault termination depending on tenancy length"],
        warnings: ["California has strong tenant protections — consult attorney before proceeding"],
      },
      {
        step: 2,
        title: "File Unlawful Detainer",
        description: "File unlawful detainer complaint in Superior Court",
        daysFromStart: 4,
        requiredDocuments: ["UD-100 form", "Summons UD-105", "Copy of notice", "Copy of lease"],
        legalRequirements: ["File in Superior Court", "Pay filing fees ($240-$480)"],
        warnings: ["Tenant has 5 business days to respond"],
      },
      {
        step: 3,
        title: "Trial or Default Judgment",
        description: "Attend court trial if tenant contests",
        daysFromStart: 30,
        requiredDocuments: ["All evidence of violation", "Rent ledger", "Communications with tenant"],
        legalRequirements: ["Trial typically within 20 days of request"],
        warnings: ["California courts heavily favor tenants — document everything"],
      },
      {
        step: 4,
        title: "Writ of Possession",
        description: "Sheriff enforces removal",
        daysFromStart: 50,
        requiredDocuments: ["Writ of execution (EJ-130)"],
        legalRequirements: ["Sheriff posts 5-day notice before lockout"],
        warnings: ["Entire process can take 3-6 months if contested"],
      },
    ],
    totalTimelineDays: 60,
  },
  NY: {
    steps: [
      {
        step: 1,
        title: "Notice of Petition",
        description: "Serve notice of petition and petition",
        daysFromStart: 0,
        requiredDocuments: ["14-day rent demand notice", "Petition", "Notice of Petition"],
        legalRequirements: ["Must give 14-day rent demand before filing", "Serve 10+ days before court date"],
        warnings: ["NYC has additional tenant protections including Good Cause Eviction law"],
      },
      {
        step: 2,
        title: "Housing Court Filing",
        description: "File with Housing Court",
        daysFromStart: 15,
        requiredDocuments: ["All signed forms", "Proof of ownership", "Lease copy"],
        legalRequirements: ["File in Housing Court (NYC) or County Court"],
        warnings: ["NYC tenants almost always contest — expect lengthy proceedings"],
      },
      {
        step: 3,
        title: "Court Appearance",
        description: "Appear in court for hearing",
        daysFromStart: 30,
        requiredDocuments: ["All documentation", "Payment records"],
        legalRequirements: ["Mandatory mediation may be required"],
        warnings: ["Judge may grant tenant payment plan or adjournment"],
      },
      {
        step: 4,
        title: "Warrant of Eviction",
        description: "Marshal enforces warrant",
        daysFromStart: 60,
        requiredDocuments: ["Warrant of Eviction"],
        legalRequirements: ["72-hour notice required before marshal executes warrant"],
        warnings: ["Entire process regularly takes 6-12+ months in NYC"],
      },
    ],
    totalTimelineDays: 90,
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role: userRole } = session.user as SessionUser;
    if (!["admin", "super_admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { stateCode, reason, tenantName, propertyAddress } = await request.json();

    if (!stateCode || !reason) {
      return NextResponse.json({ error: "stateCode and reason are required" }, { status: 400 });
    }

    const evictionRule = await JurisdictionRule.findOne({
      stateCode: stateCode.toUpperCase(),
      category: "eviction",
      isActive: true,
    }).lean();

    const fairHousingRule = await JurisdictionRule.findOne({
      stateCode: stateCode.toUpperCase(),
      category: "fair_housing",
      isActive: true,
    }).lean();

    const baseWorkflow = EVICTION_WORKFLOWS[stateCode.toUpperCase()] || {
      steps: [
        {
          step: 1,
          title: "Consult Local Attorney",
          description: "Eviction procedures vary significantly by jurisdiction. Consult a local attorney.",
          daysFromStart: 0,
          requiredDocuments: ["Written notice to tenant"],
          legalRequirements: ["Follow state-specific notice requirements"],
          warnings: ["Ensure full compliance with local law before proceeding"],
        },
      ],
      totalTimelineDays: 60,
    };

    const fairHousingWarnings: string[] = [
      "Ensure eviction reason is not based on protected class (race, color, religion, sex, national origin, disability, familial status)",
      "Document all non-discriminatory reasons thoroughly",
      "Apply eviction policies consistently across all tenants",
    ];

    if (fairHousingRule?.fairHousingProtections?.length) {
      fairHousingRule.fairHousingProtections.forEach((p) => {
        fairHousingWarnings.push(`${stateCode} also protects: ${p}`);
      });
    }

    const jurisdictionNotes: string[] = [];
    if (evictionRule?.description) {
      jurisdictionNotes.push(evictionRule.description);
    }
    if (evictionRule?.penaltyDescription) {
      jurisdictionNotes.push(`Violations: ${evictionRule.penaltyDescription}`);
    }
    if (evictionRule?.referenceUrl) {
      jurisdictionNotes.push(`Reference: ${evictionRule.referenceUrl}`);
    }

    const workflow: EvictionWorkflow = {
      stateCode: stateCode.toUpperCase(),
      reason,
      steps: baseWorkflow.steps as EvictionStep[],
      totalTimelineDays: baseWorkflow.totalTimelineDays || 60,
      jurisdictionNotes,
      fairHousingWarnings,
      recommendedAttorney: ["CA", "NY", "NJ", "MA", "IL"].includes(stateCode.toUpperCase()),
    };

    return NextResponse.json({ workflow, tenantName, propertyAddress });
  } catch (error) {
    console.error("Error generating eviction workflow:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

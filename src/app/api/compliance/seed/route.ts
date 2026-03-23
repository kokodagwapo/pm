import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import JurisdictionRule from "@/models/JurisdictionRule";

const JURISDICTION_SEED_DATA = [
  // Florida
  {
    state: "Florida",
    stateCode: "FL",
    category: "rent_control",
    title: "Florida Rent Increase Rules",
    description: "Florida has no statewide rent control. Landlords may increase rent with proper notice. Local ordinances may differ.",
    requirementType: "event_triggered",
    daysNoticeRequired: 15,
    maxRentIncreasePercent: undefined,
    rentControlled: false,
    noticePeriodDays: 15,
    evictionNoticeDays: 3,
    securityDepositMultiple: undefined,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion"],
    referenceUrl: "https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0083/0083.html",
    isActive: true,
    tags: ["rent", "florida", "landlord"],
  },
  {
    state: "Florida",
    stateCode: "FL",
    category: "eviction",
    title: "Florida Eviction Process",
    description: "Florida requires 3-day notice for non-payment of rent, 7-day notice for lease violations. Eviction filings go to county court.",
    requirementType: "event_triggered",
    daysNoticeRequired: 3,
    evictionNoticeDays: 3,
    noticePeriodDays: 15,
    rentControlled: false,
    fairHousingProtections: [],
    penaltyDescription: "Self-help evictions (lockouts, utility shutoff) result in liability for 3 months rent plus damages",
    referenceUrl: "https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0083/0083.html",
    isActive: true,
    tags: ["eviction", "florida"],
  },
  {
    state: "Florida",
    stateCode: "FL",
    category: "notice_requirements",
    title: "Florida Notice Requirements",
    description: "Month-to-month tenants require 15 days written notice to terminate. Annual leases require negotiated notice period.",
    requirementType: "event_triggered",
    daysNoticeRequired: 15,
    noticePeriodDays: 15,
    rentControlled: false,
    fairHousingProtections: [],
    isActive: true,
    tags: ["notice", "florida"],
  },
  {
    state: "Florida",
    stateCode: "FL",
    category: "fair_housing",
    title: "Florida Fair Housing Act",
    description: "Florida's Fair Housing Act mirrors federal law. Landlords may not discriminate based on race, color, national origin, sex, disability, familial status, or religion.",
    requirementType: "one_time",
    daysNoticeRequired: 0,
    rentControlled: false,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion"],
    penaltyDescription: "Fines up to $10,000 for first violation, $25,000 for second, $50,000 for subsequent violations",
    isActive: true,
    tags: ["fair-housing", "florida", "discrimination"],
  },
  {
    state: "Florida",
    stateCode: "FL",
    category: "security_deposit",
    title: "Florida Security Deposit Rules",
    description: "Security deposits must be held in a Florida bank account. No statutory limit on deposit amount. Must be returned within 15 days of lease end, or 30 days if making deductions.",
    requirementType: "one_time",
    daysNoticeRequired: 15,
    rentControlled: false,
    securityDepositMultiple: undefined,
    fairHousingProtections: [],
    penaltyDescription: "Failure to return deposit within required time forfeits right to make any claims against it",
    isActive: true,
    tags: ["security-deposit", "florida"],
  },
  // California
  {
    state: "California",
    stateCode: "CA",
    category: "rent_control",
    title: "California AB-1482 Rent Cap",
    description: "AB-1482 limits rent increases to 5% + local CPI or 10% per year (whichever is lower) for covered buildings 15+ years old. Many local rent control ordinances are stricter.",
    requirementType: "annual",
    daysNoticeRequired: 30,
    maxRentIncreasePercent: 10,
    rentControlled: true,
    noticePeriodDays: 30,
    evictionNoticeDays: 3,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Source of Income", "Sexual Orientation", "Gender Identity", "Marital Status"],
    referenceUrl: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201920200AB1482",
    isActive: true,
    tags: ["rent-control", "california", "ab1482"],
  },
  {
    state: "California",
    stateCode: "CA",
    category: "eviction",
    title: "California Just Cause Eviction (AB-1482)",
    description: "After 12 months of occupancy, landlords must have just cause to evict. Just cause includes non-payment, breach of lease, criminal activity, or owner move-in.",
    requirementType: "event_triggered",
    daysNoticeRequired: 3,
    evictionNoticeDays: 3,
    noticePeriodDays: 60,
    rentControlled: true,
    fairHousingProtections: [],
    penaltyDescription: "Wrongful eviction can result in tenant relocation assistance (1 month rent) and significant civil liability",
    referenceUrl: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201920200AB1482",
    isActive: true,
    tags: ["eviction", "california", "just-cause"],
  },
  {
    state: "California",
    stateCode: "CA",
    category: "notice_requirements",
    title: "California Notice Requirements",
    description: "30 days notice for rent increases under 10%; 90 days notice for rent increases 10% or more. 30/60 days for lease termination depending on tenancy length.",
    requirementType: "event_triggered",
    daysNoticeRequired: 30,
    noticePeriodDays: 30,
    rentControlled: true,
    fairHousingProtections: [],
    isActive: true,
    tags: ["notice", "california"],
  },
  {
    state: "California",
    stateCode: "CA",
    category: "fair_housing",
    title: "California Fair Employment and Housing Act",
    description: "California's FEHA provides broader protections than federal law, including source of income, sexual orientation, gender identity, and marital status.",
    requirementType: "one_time",
    daysNoticeRequired: 0,
    rentControlled: false,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Source of Income", "Sexual Orientation", "Gender Identity", "Marital Status"],
    penaltyDescription: "Fines up to $150,000 plus actual damages, attorney fees, and possible criminal liability",
    isActive: true,
    tags: ["fair-housing", "california", "feha"],
  },
  {
    state: "California",
    stateCode: "CA",
    category: "security_deposit",
    title: "California Security Deposit Limits",
    description: "Unfurnished: maximum 2 months rent. Furnished: maximum 3 months rent. Must return within 21 days with itemized statement.",
    requirementType: "one_time",
    daysNoticeRequired: 21,
    rentControlled: false,
    securityDepositMultiple: 2,
    fairHousingProtections: [],
    penaltyDescription: "Bad faith retention results in up to 2x the deposit amount in penalties",
    isActive: true,
    tags: ["security-deposit", "california"],
  },
  // New York
  {
    state: "New York",
    stateCode: "NY",
    category: "rent_control",
    title: "New York Rent Stabilization",
    description: "NYC Rent Stabilization covers buildings built before 1974 with 6+ units. Annual rent increases set by NYC Rent Guidelines Board. Statewide Emergency Tenant Protection Act applies in many municipalities.",
    requirementType: "annual",
    daysNoticeRequired: 30,
    maxRentIncreasePercent: 3,
    rentControlled: true,
    noticePeriodDays: 30,
    evictionNoticeDays: 14,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Source of Income", "Sexual Orientation", "Gender Identity", "Lawful Occupation", "Age"],
    referenceUrl: "https://hcr.ny.gov/rent-stabilization-and-rent-control",
    isActive: true,
    tags: ["rent-stabilization", "new-york", "nyc"],
  },
  {
    state: "New York",
    stateCode: "NY",
    category: "eviction",
    title: "New York Eviction Process",
    description: "14-day notice for non-payment. Eviction proceedings in Housing Court. Good Cause Eviction Law (2024) requires just cause in many cases.",
    requirementType: "event_triggered",
    daysNoticeRequired: 14,
    evictionNoticeDays: 14,
    noticePeriodDays: 30,
    rentControlled: true,
    fairHousingProtections: [],
    penaltyDescription: "Illegal lockouts result in 3x monthly rent plus attorney fees",
    referenceUrl: "https://www.courts.state.ny.us/courthelp/GoingToCourt/housingCourt.shtml",
    isActive: true,
    tags: ["eviction", "new-york"],
  },
  {
    state: "New York",
    stateCode: "NY",
    category: "fair_housing",
    title: "New York Human Rights Law",
    description: "New York State Human Rights Law provides broad protections including source of income, sexual orientation, gender identity, and lawful occupation.",
    requirementType: "one_time",
    daysNoticeRequired: 0,
    rentControlled: false,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Source of Income", "Sexual Orientation", "Gender Identity", "Lawful Occupation", "Age"],
    penaltyDescription: "Civil penalties up to $250,000 plus compensatory and punitive damages",
    isActive: true,
    tags: ["fair-housing", "new-york"],
  },
  {
    state: "New York",
    stateCode: "NY",
    category: "security_deposit",
    title: "New York Security Deposit Limit",
    description: "Maximum security deposit is 1 month's rent (HSTPA 2019). Must return within 14 days with itemized statement.",
    requirementType: "one_time",
    daysNoticeRequired: 14,
    rentControlled: false,
    securityDepositMultiple: 1,
    fairHousingProtections: [],
    penaltyDescription: "Wrongful withholding of deposit entitles tenant to double the withheld amount",
    isActive: true,
    tags: ["security-deposit", "new-york"],
  },
  // Texas
  {
    state: "Texas",
    stateCode: "TX",
    category: "rent_control",
    title: "Texas Rent Control Prohibition",
    description: "Texas law explicitly prohibits local governments from enacting rent control ordinances. No cap on rent increases with proper notice.",
    requirementType: "event_triggered",
    daysNoticeRequired: 30,
    maxRentIncreasePercent: undefined,
    rentControlled: false,
    noticePeriodDays: 30,
    evictionNoticeDays: 3,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion"],
    referenceUrl: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm",
    isActive: true,
    tags: ["rent-control", "texas"],
  },
  {
    state: "Texas",
    stateCode: "TX",
    category: "eviction",
    title: "Texas Eviction Process",
    description: "Texas requires 3-day notice to vacate before filing eviction. Filing occurs at Justice of the Peace court.",
    requirementType: "event_triggered",
    daysNoticeRequired: 3,
    evictionNoticeDays: 3,
    noticePeriodDays: 30,
    rentControlled: false,
    fairHousingProtections: [],
    penaltyDescription: "Illegal lockouts result in tenant recovering $100/day plus attorney fees",
    referenceUrl: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm",
    isActive: true,
    tags: ["eviction", "texas"],
  },
  {
    state: "Texas",
    stateCode: "TX",
    category: "security_deposit",
    title: "Texas Security Deposit Rules",
    description: "No statutory limit on deposit amount. Must return within 30 days after move-out, or 60 days if tenant disputes deductions.",
    requirementType: "one_time",
    daysNoticeRequired: 30,
    rentControlled: false,
    securityDepositMultiple: undefined,
    fairHousingProtections: [],
    penaltyDescription: "Bad faith retention: tenant recovers 3x the withheld amount plus attorney fees",
    isActive: true,
    tags: ["security-deposit", "texas"],
  },
  // Washington
  {
    state: "Washington",
    stateCode: "WA",
    category: "rent_control",
    title: "Washington Rent Increase Notice",
    description: "Washington state requires 180 days written notice before rent increases. Seattle has additional just cause eviction protections.",
    requirementType: "event_triggered",
    daysNoticeRequired: 180,
    maxRentIncreasePercent: undefined,
    rentControlled: false,
    noticePeriodDays: 180,
    evictionNoticeDays: 14,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Sexual Orientation", "Gender Identity", "Veteran Status"],
    referenceUrl: "https://app.leg.wa.gov/RCW/default.aspx?cite=59.18",
    isActive: true,
    tags: ["rent-increase", "washington"],
  },
  {
    state: "Washington",
    stateCode: "WA",
    category: "eviction",
    title: "Washington Eviction (Unlawful Detainer)",
    description: "14-day notice for non-payment, 10-day notice for lease violations. Just Cause Eviction Act applies in many cities.",
    requirementType: "event_triggered",
    daysNoticeRequired: 14,
    evictionNoticeDays: 14,
    noticePeriodDays: 20,
    rentControlled: false,
    fairHousingProtections: [],
    penaltyDescription: "Retaliatory evictions result in tenant recovery of up to 4.5 months rent",
    isActive: true,
    tags: ["eviction", "washington"],
  },
  {
    state: "Washington",
    stateCode: "WA",
    category: "fair_housing",
    title: "Washington Law Against Discrimination",
    description: "WLAD prohibits discrimination in housing based on race, creed, color, national origin, sex, disability, familial status, sexual orientation, gender identity, and veteran status.",
    requirementType: "one_time",
    daysNoticeRequired: 0,
    rentControlled: false,
    fairHousingProtections: ["Race", "Color", "National Origin", "Sex", "Disability", "Familial Status", "Religion", "Sexual Orientation", "Gender Identity", "Veteran Status"],
    penaltyDescription: "Civil liability for actual damages, punitive damages up to $2,000, and attorney fees",
    isActive: true,
    tags: ["fair-housing", "washington", "wlad"],
  },
  {
    state: "Washington",
    stateCode: "WA",
    category: "security_deposit",
    title: "Washington Security Deposit Rules",
    description: "No statutory limit. Must be held in trust. Must return within 30 days with itemized statement of deductions.",
    requirementType: "one_time",
    daysNoticeRequired: 30,
    rentControlled: false,
    securityDepositMultiple: undefined,
    fairHousingProtections: [],
    penaltyDescription: "Wrongful withholding entitles tenant to twice the deposit amount plus attorney fees",
    isActive: true,
    tags: ["security-deposit", "washington"],
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role: userRole } = session.user as { id: string; role: string };
    if (!["admin", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const existing = await JurisdictionRule.countDocuments();
    if (existing > 0) {
      return NextResponse.json({
        message: "Jurisdiction rules already seeded",
        count: existing,
      });
    }

    const inserted = await JurisdictionRule.insertMany(JURISDICTION_SEED_DATA);

    return NextResponse.json({
      message: "Jurisdiction rules seeded successfully",
      count: inserted.length,
      states: ["FL", "CA", "NY", "TX", "WA"],
    });
  } catch (error) {
    console.error("Error seeding jurisdiction rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const count = await JurisdictionRule.countDocuments();
    return NextResponse.json({ seeded: count > 0, count });
  } catch (error) {
    console.error("Error checking seed status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

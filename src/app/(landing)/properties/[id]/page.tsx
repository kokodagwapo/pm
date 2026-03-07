import { PropertyDetailClient } from "./PropertyDetailClient";
import connectDB from "@/lib/mongodb";
import Property from "@/models/Property";
import DateBlock from "@/models/DateBlock";
import PricingRule from "@/models/PricingRule";

async function getProperty(id: string) {
  try {
    if (!id || id.length !== 24) return null;
    await connectDB();
    const property = await Property.findById(id).lean();
    if (!property) return null;

    const propertyObj = JSON.parse(JSON.stringify(property));

    const now = new Date();
    const twoYearsOut = new Date();
    twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);
    const unitIds = (propertyObj.units || []).map((u: any) => u._id);

    const [blocks, pricingRules] = await Promise.all([
      DateBlock.find({
        propertyId: id,
        unitId: { $in: unitIds },
        isActive: true,
        endDate: { $gte: now },
        startDate: { $lte: twoYearsOut },
      })
        .select("unitId startDate endDate blockType")
        .sort({ startDate: 1 })
        .lean(),
      PricingRule.find({
        propertyId: id,
        unitId: { $in: unitIds },
        isActive: true,
      })
        .select("unitId name ruleType startDate endDate pricePerNight priceModifier daysOfWeek minimumStay priority")
        .sort({ priority: -1 })
        .lean(),
    ]);

    propertyObj.availability = {
      blocks: JSON.parse(JSON.stringify(blocks.map((b: any) => ({
        _id: b._id,
        unitId: b.unitId,
        startDate: b.startDate,
        endDate: b.endDate,
        blockType: b.blockType,
      })))),
      pricingRules: JSON.parse(JSON.stringify(pricingRules.map((r: any) => ({
        _id: r._id,
        unitId: r.unitId,
        name: r.name,
        ruleType: r.ruleType,
        startDate: r.startDate,
        endDate: r.endDate,
        pricePerNight: r.pricePerNight,
        priceModifier: r.priceModifier,
        daysOfWeek: r.daysOfWeek,
        minimumStay: r.minimumStay,
        isActive: true,
      })))),
    };

    return propertyObj;
  } catch {
    return null;
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialProperty = await getProperty(id);
  return <PropertyDetailClient id={id} initialProperty={initialProperty} />;
}

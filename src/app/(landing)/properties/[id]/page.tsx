import { PropertyDetailClient } from "./PropertyDetailClient";
import connectDB from "@/lib/mongodb";
import Property from "@/models/Property";

async function getProperty(id: string) {
  try {
    if (!id || id.length !== 24) return null;
    await connectDB();
    const property = await Property.findById(id).lean();
    if (!property) return null;
    return JSON.parse(JSON.stringify(property));
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

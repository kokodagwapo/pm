import { SystemSettingsNew } from "@/models";
import connectDB from "@/lib/mongodb";

export async function getGeminiConfig() {
  await connectDB();
  const settings = await SystemSettingsNew.findOne({ isActive: true }).lean();
  
  const gemini = (settings as any)?.integrations?.gemini;
  const envKey = process.env.GEMINI_API_KEY;
  
  return {
    enabled: gemini?.enabled ?? (!!envKey),
    apiKey: gemini?.apiKey || envKey,
    model: gemini?.model || "gemini-2.0-flash-exp",
  };
}

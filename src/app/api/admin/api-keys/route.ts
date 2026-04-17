export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { SystemSettingsNew } from "@/models";
import { UserRole } from "@/types";

function maskKey(value?: string): string {
  if (!value || value.length < 8) return value ? "••••••••" : "";
  return "••••••••" + value.slice(-4);
}

function buildMasked(settings: any) {
  const p = settings?.payment ?? {};
  const i = settings?.integrations ?? {};
  const e = settings?.email ?? {};
  return {
    stripe: {
      secretKey: { masked: maskKey(p.stripeSecretKey), configured: !!p.stripeSecretKey },
      publishableKey: { masked: maskKey(p.stripePublishableKey), configured: !!p.stripePublishableKey },
      webhookSecret: { masked: maskKey(p.stripeWebhookSecret), configured: !!p.stripeWebhookSecret },
    },
    openai: {
      apiKey: { masked: maskKey(i.openai?.apiKey), configured: !!i.openai?.apiKey },
      model: { value: i.openai?.model ?? "gpt-4o", configured: true },
      enabled: i.openai?.enabled ?? false,
    },
    twilio: {
      accountSid: { masked: maskKey(i.sms?.apiKey), configured: !!i.sms?.apiKey },
      authToken: { masked: maskKey(i.sms?.apiSecret), configured: !!i.sms?.apiSecret },
      fromNumber: { value: i.sms?.fromNumber ?? "", configured: !!i.sms?.fromNumber },
      enabled: i.sms?.enabled ?? false,
    },
    googleMaps: {
      apiKey: { masked: maskKey(i.googleMaps?.apiKey), configured: !!i.googleMaps?.apiKey },
      enabled: i.googleMaps?.enabled ?? false,
    },
    email: {
      smtpHost: { value: e.smtpHost ?? "", configured: !!e.smtpHost },
      smtpPort: { value: e.smtpPort ?? 587, configured: true },
      smtpUser: { value: e.smtpUser ?? "", configured: !!e.smtpUser },
      smtpPassword: { masked: maskKey(e.smtpPassword), configured: !!e.smtpPassword },
      fromEmail: { value: e.fromEmail ?? "", configured: !!e.fromEmail },
      fromName: { value: e.fromName ?? "", configured: !!e.fromName },
    },
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const settings = await (SystemSettingsNew as any).findOne({ isActive: true }).lean();
    return NextResponse.json({ success: true, data: buildMasked(settings) });
  } catch (err) {
    console.error("GET /api/admin/api-keys error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const body = await request.json();
    const { service, field, value } = body as { service: string; field: string; value: string };
    if (!service || !field) {
      return NextResponse.json({ error: "service and field are required" }, { status: 400 });
    }

    const fieldMap: Record<string, string> = {
      "stripe.secretKey": "payment.stripeSecretKey",
      "stripe.publishableKey": "payment.stripePublishableKey",
      "stripe.webhookSecret": "payment.stripeWebhookSecret",
      "openai.apiKey": "integrations.openai.apiKey",
      "openai.model": "integrations.openai.model",
      "openai.enabled": "integrations.openai.enabled",
      "twilio.accountSid": "integrations.sms.apiKey",
      "twilio.authToken": "integrations.sms.apiSecret",
      "twilio.fromNumber": "integrations.sms.fromNumber",
      "twilio.enabled": "integrations.sms.enabled",
      "googleMaps.apiKey": "integrations.googleMaps.apiKey",
      "googleMaps.enabled": "integrations.googleMaps.enabled",
      "email.smtpHost": "email.smtpHost",
      "email.smtpPort": "email.smtpPort",
      "email.smtpUser": "email.smtpUser",
      "email.smtpPassword": "email.smtpPassword",
      "email.fromEmail": "email.fromEmail",
      "email.fromName": "email.fromName",
    };

    const dbField = fieldMap[`${service}.${field}`];
    if (!dbField) {
      return NextResponse.json({ error: "Unknown field" }, { status: 400 });
    }

    await (SystemSettingsNew as any).findOneAndUpdate(
      { isActive: true },
      { $set: { [dbField]: value, updatedBy: session.user.id } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin/api-keys error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";
import connectDB from "@/lib/mongodb";
import { Property } from "@/models";
import { calculatePrice } from "@/lib/services/pricing.service";
import PricingRule from "@/models/PricingRule";
import { sendSMS } from "@/lib/services/sms.service";
import { z } from "zod";

const inquirySchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  message: z.string().max(1000).optional(),
  pricingSnapshot: z.any().optional(),
});

async function sendSimpleEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;
    const host = process.env.EMAIL_SERVER_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_SERVER_PORT || "587");
    if (!user || !pass) return;

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from: user, to, subject, html });
  } catch (err) {
    console.warn("[Inquiry] Email send failed:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) return createErrorResponse(error!, 400);

    const validation = inquirySchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        `Validation failed: ${validation.error.errors.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { propertyId, unitId, startDate, endDate, firstName, lastName, email, phone, message, pricingSnapshot } = validation.data;

    if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
      return createErrorResponse("Invalid property or unit ID", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return createErrorResponse("Invalid date range", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return createErrorResponse("Start date cannot be in the past", 400);
    }

    const property = await Property.findById(propertyId).lean();
    if (!property) return createErrorResponse("Property not found", 404);

    const propertyObj = property as any;
    const unit = propertyObj.units?.find((u: any) => u._id?.toString() === unitId);
    if (!unit) return createErrorResponse("Unit not found", 404);

    let pricing = pricingSnapshot;
    if (!pricing) {
      const baseRentPerNight = unit.rentAmount ? unit.rentAmount / 30 : 0;
      if (baseRentPerNight > 0) {
        const pricingRules = await PricingRule.find({ propertyId, unitId, isActive: true }).lean();
        pricing = calculatePrice({
          baseRentPerNight,
          startDate: start,
          endDate: end,
          pricingRules: pricingRules as any,
          bookingDate: new Date(),
        });
      }
    }

    const inquiryRef = `INQ-${Date.now().toString(36).toUpperCase()}`;
    const fullName = `${firstName} ${lastName}`;
    const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const totalCost = pricing?.calculatedPrice
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pricing.calculatedPrice)
      : "See pricing details";

    const guestEmailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9;">Rental Inquiry Received</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for your interest! We've received your rental inquiry and will get back to you within 24 hours.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reference:</strong> ${inquiryRef}</p>
          <p style="margin: 4px 0;"><strong>Property:</strong> ${propertyObj.name}</p>
          <p style="margin: 4px 0;"><strong>Dates:</strong> ${dateRange}</p>
          <p style="margin: 4px 0;"><strong>Estimated Total:</strong> ${totalCost}</p>
        </div>
        <p>We'll review your request and contact you at ${email}${phone ? ` or ${phone}` : ""}.</p>
        <p style="color: #64748b; font-size: 12px;">SmartStartPM · Naples, FL</p>
      </div>
    `;

    const managerEmailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9;">New Rental Inquiry</h2>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Reference:</strong> ${inquiryRef}</p>
          <p style="margin: 4px 0;"><strong>Guest:</strong> ${fullName}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          ${phone ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${phone}</p>` : ""}
          <p style="margin: 4px 0;"><strong>Property:</strong> ${propertyObj.name}</p>
          <p style="margin: 4px 0;"><strong>Dates:</strong> ${dateRange}</p>
          <p style="margin: 4px 0;"><strong>Estimated Total:</strong> ${totalCost}</p>
          ${message ? `<p style="margin: 4px 0;"><strong>Message:</strong> ${message}</p>` : ""}
        </div>
        <p>Log in to the portal to respond to this inquiry.</p>
      </div>
    `;

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SERVER_USER;

    await Promise.allSettled([
      sendSimpleEmail(email, `Rental Inquiry Received – ${inquiryRef}`, guestEmailHtml),
      adminEmail ? sendSimpleEmail(adminEmail, `New Rental Inquiry: ${propertyObj.name} – ${fullName}`, managerEmailHtml) : Promise.resolve(),
      phone ? sendSMS(phone, `Hi ${firstName}! Your rental inquiry for ${propertyObj.name} (${dateRange}) has been received. Ref: ${inquiryRef}. We'll contact you within 24hrs. — SmartStartPM`) : Promise.resolve(),
      adminEmail && phone
        ? Promise.resolve()
        : Promise.resolve(),
    ]);

    return createSuccessResponse(
      {
        inquiryRef,
        propertyName: propertyObj.name,
        dateRange,
        totalCost,
        guestName: fullName,
      },
      "Inquiry submitted successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

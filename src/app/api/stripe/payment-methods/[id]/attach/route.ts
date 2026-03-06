/**
 * SmartStartPM - Stripe Payment Method Attach API
 * Attach payment methods to customers
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function getStripeInstance() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentMethodId = params.id;
    const body = await request.json();
    const { customer } = body;

    if (!customer) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Attach payment method to customer
    const paymentMethod = await getStripeInstance().paymentMethods.attach(paymentMethodId, {
      customer,
    });


    return NextResponse.json({
      id: paymentMethod.id,
      type: paymentMethod.type,
      customer: paymentMethod.customer,
      card: paymentMethod.card,
      billing_details: paymentMethod.billing_details,
    });
  } catch (error) {
    console.error("Stripe payment method attach error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

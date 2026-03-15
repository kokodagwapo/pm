/**
 * SmartStartPM - Stripe Payment Method Detach API
 * Detach payment methods from customers
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

    // Detach payment method from customer
    const paymentMethod = await getStripeInstance().paymentMethods.detach(paymentMethodId);


    return NextResponse.json({
      id: paymentMethod.id,
      type: paymentMethod.type,
      detached: true,
    });
  } catch (error) {
    console.error("Stripe payment method detach error:", error);

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

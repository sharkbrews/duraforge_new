import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { trackEmailEvent } from "@/lib/email-events";

// Stripe webhook. Configure the endpoint + signing secret in the Stripe
// dashboard and set STRIPE_WEBHOOK_SECRET. Handles payment lifecycle events.
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      trackEmailEvent("order.placed", {
        email: intent.metadata?.email,
        userId: intent.metadata?.userId,
        stripePaymentIntent: intent.id,
      });
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.warn("Payment failed for intent:", intent.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      console.info("Charge refunded:", charge.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

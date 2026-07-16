import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { priceBasket } from "@/lib/order-pricing";

/**
 * Creates a Stripe PaymentIntent for the current basket and returns the client
 * secret. If Stripe isn't configured, responds with { mock: true } so the
 * checkout falls back to the simulated flow (local dev / pre-Stripe).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to checkout." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const priced = priceBasket(body.items);
  if (!priced) {
    return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ mock: true, amount: priced.totalIncVat });
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(priced.totalIncVat * 100),
    currency: "gbp",
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId: user.id,
      companyName: user.companyName,
      email: user.email,
    },
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    amount: priced.totalIncVat,
  });
}

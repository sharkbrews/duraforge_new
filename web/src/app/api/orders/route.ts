import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrder, getOrdersForUser } from "@/lib/store";
import { priceBasket } from "@/lib/order-pricing";
import { getStripe } from "@/lib/stripe";
import type { PaymentMethod } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to checkout." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { items, paymentMethod, notes, paymentIntentId } = body as {
      items?: { sku: string; quantity: number }[];
      paymentMethod?: PaymentMethod;
      notes?: string;
      paymentIntentId?: string;
    };

    const priced = priceBasket(items);
    if (!priced) {
      return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
    }

    const method: PaymentMethod = paymentMethod === "bacs" ? "bacs" : "card";

    // When Stripe is live and this is a card payment, verify the PaymentIntent
    // actually succeeded and matches the server-computed total before we
    // record the order. BACS orders are held until payment clears (no charge).
    const stripe = getStripe();
    if (stripe && method === "card") {
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "Missing payment confirmation." },
          { status: 400 },
        );
      }
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded") {
        return NextResponse.json(
          { error: "Payment not completed." },
          { status: 402 },
        );
      }
      if (intent.amount !== Math.round(priced.totalIncVat * 100)) {
        return NextResponse.json(
          { error: "Payment amount mismatch." },
          { status: 400 },
        );
      }
    }

    const order = await createOrder({
      userId: user.id,
      companyName: user.companyName,
      email: user.email,
      lineItems: priced.lineItems,
      subtotalExVat: priced.subtotalExVat,
      vatAmount: priced.vatAmount,
      totalIncVat: priced.totalIncVat,
      paymentMethod: method,
      shippingAddress: user.deliveryAddress,
      notes,
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Could not place order." }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ orders });
}

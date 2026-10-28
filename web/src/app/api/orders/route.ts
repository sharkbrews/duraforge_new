import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrder, getOrdersForUser } from "@/lib/store";
import { priceBasket } from "@/lib/order-pricing";

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
    const { items, notes } = body as {
      items?: { sku: string; quantity: number }[];
      notes?: string;
    };

    const priced = priceBasket(items);
    if (!priced) {
      return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
    }

    const order = await createOrder({
      userId: user.id,
      companyName: user.companyName,
      email: user.email,
      lineItems: priced.lineItems,
      subtotalExVat: priced.subtotalExVat,
      vatAmount: priced.vatAmount,
      totalIncVat: priced.totalIncVat,
      paymentMethod: "trade_account",
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

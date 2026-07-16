import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrder, getOrdersForUser } from "@/lib/store";
import { getProduct } from "@/lib/products";
import type { OrderLineItem, PaymentMethod } from "@/lib/types";

const VAT_RATE = 0.2;

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
    const { items, paymentMethod, notes } = body as {
      items?: { sku: string; quantity: number }[];
      paymentMethod?: PaymentMethod;
      notes?: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
    }

    const method: PaymentMethod = paymentMethod === "bacs" ? "bacs" : "card";

    const lineItems: OrderLineItem[] = [];
    for (const item of items) {
      const product = getProduct(item.sku);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.sku}` },
          { status: 400 },
        );
      }
      if (item.quantity < 1) continue;
      lineItems.push({
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPriceExVat: product.price,
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
    }

    const subtotalExVat =
      Math.round(
        lineItems.reduce((sum, li) => sum + li.unitPriceExVat * li.quantity, 0) *
          100,
      ) / 100;
    const vatAmount = Math.round(subtotalExVat * VAT_RATE * 100) / 100;
    const totalIncVat = Math.round((subtotalExVat + vatAmount) * 100) / 100;

    const order = await createOrder({
      userId: user.id,
      companyName: user.companyName,
      email: user.email,
      lineItems,
      subtotalExVat,
      vatAmount,
      totalIncVat,
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

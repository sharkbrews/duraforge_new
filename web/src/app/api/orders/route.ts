import { NextResponse } from "next/server";
import { getSessionUser, newOrderId } from "@/lib/auth";
import {
  getOrders,
  nextOrderNumber,
  saveOrders,
} from "@/lib/store";
import { getProduct } from "@/lib/products";
import type { OrderLineItem, PaymentMethod } from "@/lib/types";

const VAT_RATE = 0.2;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to checkout." }, { status: 401 });
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

    const subtotalExVat = lineItems.reduce(
      (sum, li) => sum + li.unitPriceExVat * li.quantity,
      0,
    );
    const vatAmount = Math.round(subtotalExVat * VAT_RATE * 100) / 100;
    const totalIncVat = Math.round((subtotalExVat + vatAmount) * 100) / 100;

    const orderNumber = await nextOrderNumber();
    const order = {
      id: newOrderId(),
      orderNumber,
      userId: user.id,
      companyName: user.companyName,
      email: user.email,
      status: "received" as const,
      lineItems,
      subtotalExVat,
      vatAmount,
      totalIncVat,
      paymentMethod: method,
      shippingAddress: user.deliveryAddress,
      billingAddress: user.deliveryAddress,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const orders = await getOrders();
    orders.push(order);
    await saveOrders(orders);

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

  const { getOrdersForUser } = await import("@/lib/store");
  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ orders });
}

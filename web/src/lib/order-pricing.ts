import { getProduct } from "./products";
import type { OrderLineItem } from "./types";

export const VAT_RATE = 0.2;

export interface PricedOrder {
  lineItems: OrderLineItem[];
  subtotalExVat: number;
  vatAmount: number;
  totalIncVat: number;
}

/**
 * Authoritatively price a basket from the server-side product catalogue.
 * Never trust client-supplied prices. Returns null if nothing valid.
 */
export function priceBasket(
  items: { sku: string; quantity: number }[] | undefined,
): PricedOrder | null {
  if (!items?.length) return null;

  const lineItems: OrderLineItem[] = [];
  for (const item of items) {
    const product = getProduct(item.sku);
    if (!product) return null;
    if (item.quantity < 1) continue;
    lineItems.push({
      sku: product.sku,
      name: product.name,
      quantity: item.quantity,
      unitPriceExVat: product.price,
    });
  }
  if (lineItems.length === 0) return null;

  const subtotalExVat =
    Math.round(
      lineItems.reduce((sum, li) => sum + li.unitPriceExVat * li.quantity, 0) *
        100,
    ) / 100;
  const vatAmount = Math.round(subtotalExVat * VAT_RATE * 100) / 100;
  const totalIncVat = Math.round((subtotalExVat + vatAmount) * 100) / 100;

  return { lineItems, subtotalExVat, vatAmount, totalIncVat };
}

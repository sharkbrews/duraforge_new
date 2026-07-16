"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/products";
import { gbp } from "@/lib/format";

const VAT_RATE = 0.2;

export function BasketView() {
  const { items, setQuantity, removeItem } = useCart();

  const lines = useMemo(
    () =>
      items
        .map((item) => {
          const product = getProduct(item.sku);
          if (!product) return null;
          return { item, product };
        })
        .filter(Boolean) as {
        item: { sku: string; quantity: number };
        product: NonNullable<ReturnType<typeof getProduct>>;
      }[],
    [items],
  );

  const subtotal = lines.reduce(
    (sum, { item, product }) => sum + product.price * item.quantity,
    0,
  );
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-4xl">🚜</p>
        <h2 className="mt-4 font-display text-xl font-bold text-navy">
          Your basket&apos;s as empty as a Friday afternoon workshop.
        </h2>
        <p className="mt-2 text-sm text-slate-brand">Fix that →</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange-600"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {lines.map(({ item, product }) => (
          <div
            key={item.sku}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <Link
                href={`/product/${product.sku}`}
                className="font-display font-bold text-navy hover:text-orange"
              >
                {product.name}
              </Link>
              <p className="mt-1 font-mono text-xs text-slate-brand">{product.sku}</p>
              <p className="mt-1 text-sm text-slate-brand">
                {gbp(product.price)} ex-VAT each
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setQuantity(item.sku, item.quantity - 1)}
                  className="px-3 py-2 text-slate-brand hover:text-navy"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-bold">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.sku, item.quantity + 1)}
                  className="px-3 py-2 text-slate-brand hover:text-navy"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <p className="min-w-[80px] text-right font-bold text-navy">
                {gbp(product.price * item.quantity)}
              </p>
              <button
                type="button"
                onClick={() => removeItem(item.sku)}
                className="text-xs text-slate-brand hover:text-orange"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-brand">Subtotal (ex-VAT)</dt>
            <dd className="font-semibold">{gbp(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-brand">VAT (20%)</dt>
            <dd className="font-semibold">{gbp(vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
            <dt className="font-bold text-navy">Total</dt>
            <dd className="font-extrabold text-navy">{gbp(total)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-brand">
          Order before 11am for same-day dispatch within 30 miles of Swanscombe.
        </p>
        <Link
          href="/checkout"
          className="mt-5 block rounded-lg bg-orange py-3 text-center font-semibold text-white hover:bg-orange-600"
        >
          Proceed to checkout →
        </Link>
      </aside>
    </div>
  );
}

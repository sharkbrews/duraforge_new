"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/products";
import { gbp } from "@/lib/format";
import type { PaymentMethod, PublicUser } from "@/lib/types";

const VAT_RATE = 0.2;

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: PublicUser | null }) => {
        setUser(data.user);
        setLoading(false);
        if (!data.user) router.replace("/account/login?next=/checkout");
      })
      .catch(() => {
        setLoading(false);
        router.replace("/account/login?next=/checkout");
      });
  }, [router]);

  const lines = useMemo(
    () =>
      items
        .map((item) => {
          const product = getProduct(item.sku);
          return product ? { item, product } : null;
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

  useEffect(() => {
    if (!loading && lines.length === 0) {
      router.replace("/basket");
    }
  }, [loading, lines.length, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          paymentMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        setSubmitting(false);
        return;
      }
      clearCart();
      router.push(`/checkout/confirmation?order=${encodeURIComponent(data.order.orderNumber)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <p className="text-center text-slate-brand">Loading checkout…</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-navy">Delivery details</h2>
          <p className="mt-2 text-sm text-slate-brand">
            {user.companyName} · {user.email}
          </p>
          <address className="mt-3 not-italic text-sm text-ink">
            {user.deliveryAddress.line1}
            {user.deliveryAddress.line2 && <>, {user.deliveryAddress.line2}</>}
            <br />
            {user.deliveryAddress.city}
            {user.deliveryAddress.county && `, ${user.deliveryAddress.county}`}
            <br />
            {user.deliveryAddress.postcode}
          </address>
          <Link href="/account" className="mt-3 inline-block text-xs font-semibold text-orange hover:underline">
            Update address in account →
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-navy">Payment</h2>
          <p className="mt-1 text-xs text-slate-brand">
            Mock checkout for now — no real card charge. Stripe goes live in Stage 4.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                className="mt-1 accent-orange"
              />
              <div>
                <p className="font-semibold text-navy">Card / Google Pay / Apple Pay</p>
                <p className="text-xs text-slate-brand">Instant confirmation (simulated)</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 has-[:checked]:border-orange has-[:checked]:bg-orange/5">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "bacs"}
                onChange={() => setPaymentMethod("bacs")}
                className="mt-1 accent-orange"
              />
              <div>
                <p className="font-semibold text-navy">BACS bank transfer</p>
                <p className="text-xs text-slate-brand">
                  Order held until payment clears. Reference sent on confirmation.
                </p>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <label className="block text-sm font-bold text-navy" htmlFor="notes">
            Order notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Machine reg, urgent delivery, gate code…"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
          />
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-navy">Your order</h2>
        <ul className="mt-4 space-y-3 border-b border-slate-100 pb-4 text-sm">
          {lines.map(({ item, product }) => (
            <li key={item.sku} className="flex justify-between gap-2">
              <span className="text-slate-brand">
                {product.name} × {item.quantity}
              </span>
              <span className="shrink-0 font-semibold">
                {gbp(product.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-brand">Subtotal ex-VAT</dt>
            <dd>{gbp(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-brand">VAT</dt>
            <dd>{gbp(vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
            <dt>Total</dt>
            <dd>{gbp(total)}</dd>
          </div>
        </dl>
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-lg bg-orange py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}

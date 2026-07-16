import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { OrderTracker } from "@/components/order-tracker";
import { getSessionUserId } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/store";
import { gbp } from "@/lib/format";

export const metadata: Metadata = {
  title: "Track order | Duraforge UK",
};

export default async function OrderTrackPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/account/login");

  const { orderNumber } = await params;
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  if (!order || order.userId !== userId) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/account/orders" className="text-sm text-slate-brand hover:text-orange">
        ← Order history
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">
        Track your order
      </h1>
      <p className="mt-1 font-mono text-sm font-bold text-orange">{order.orderNumber}</p>

      <div className="mt-8">
        <OrderTracker order={order} />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display font-bold text-navy">Order summary</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-brand">
          {order.lineItems.map((li) => (
            <li key={li.sku}>
              {li.name} × {li.quantity}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold text-navy">{gbp(order.totalIncVat)} inc-VAT</p>
      </section>
    </div>
  );
}

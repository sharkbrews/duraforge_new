import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/store";
import { gbp } from "@/lib/format";

export const metadata: Metadata = {
  title: "Order history | Duraforge UK",
};

const statusLabels: Record<string, string> = {
  received: "Received",
  picking: "Picking",
  packed: "Packed",
  despatched: "Despatched",
  delivered: "Delivered",
};

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login");

  const orders = await getOrdersForUser(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/account" className="text-sm text-slate-brand hover:text-orange">
        ← Back to account
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">Order history</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-slate-brand">No orders yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-navy">{order.orderNumber}</p>
                  <p className="text-xs text-slate-brand">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
                  {statusLabels[order.status]}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-brand">
                {order.lineItems.map((li) => (
                  <li key={li.sku}>
                    {li.name} × {li.quantity}
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-semibold text-navy">
                {gbp(order.totalIncVat)} inc-VAT
              </p>
              <Link
                href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                className="mt-3 inline-block text-sm font-semibold text-orange hover:underline"
              >
                Track order →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

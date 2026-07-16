import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/store";
import { LogoutButton } from "@/components/logout-button";
import { gbp } from "@/lib/format";

export const metadata: Metadata = {
  title: "Trade Account | Duraforge UK",
};

const statusLabels: Record<string, string> = {
  received: "Order received — we've got it, we're on it 💪",
  picking: "Picking — rummaging through the shelves…",
  packed: "Packed & quality checked",
  despatched: "Despatched — it's gone!",
  delivered: "Delivered — job done",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/account/login");

  const orders = await getOrdersForUser(user.id);
  const lastOrder = orders[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy">
            Morning, {user.companyName}.
          </h1>
          <p className="mt-2 text-slate-brand">Ready to keep the machines moving?</p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display font-bold text-navy">Last order</h2>
          {lastOrder ? (
            <>
              <p className="mt-2 font-mono text-sm font-bold text-navy">
                {lastOrder.orderNumber}
              </p>
              <p className="mt-1 text-sm text-slate-brand">
                {statusLabels[lastOrder.status] ?? lastOrder.status}
              </p>
              <p className="mt-2 text-sm font-semibold">{gbp(lastOrder.totalIncVat)} inc-VAT</p>
              <Link
                href="/account/orders"
                className="mt-4 inline-block text-sm font-semibold text-orange hover:underline"
              >
                View all orders →
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-brand">No orders yet. Time to fix that.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display font-bold text-navy">Delivery address</h2>
          <address className="mt-2 not-italic text-sm text-slate-brand">
            {user.deliveryAddress.line1}
            <br />
            {user.deliveryAddress.city}, {user.deliveryAddress.postcode}
          </address>
          <p className="mt-2 text-xs text-slate-brand">{user.email} · {user.phone}</p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Browse catalogue
        </Link>
        <Link
          href="/finder"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-navy hover:border-orange"
        >
          Seal Kit Finder
        </Link>
      </div>
    </div>
  );
}

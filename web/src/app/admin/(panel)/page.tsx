import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { countNewEnquiries, getAllOrders } from "@/lib/store";
import { gbp } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [orders, newEnquiries, productCount] = await Promise.all([
    getAllOrders(),
    countNewEnquiries(),
    prisma.product.count(),
  ]);

  const openOrders = orders.filter((o) => o.status !== "delivered").length;
  const revenue = orders.reduce((sum, o) => sum + o.totalIncVat, 0);

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Dashboard</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Warehouse view — update orders, check margins, reply to enquiries.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open orders" value={String(openOrders)} href="/admin/orders" />
        <StatCard label="Total orders" value={String(orders.length)} href="/admin/orders" />
        <StatCard label="Revenue (inc-VAT)" value={gbp(revenue)} href="/admin/orders" />
        <StatCard
          label="New enquiries"
          value={String(newEnquiries)}
          href="/admin/enquiries"
          highlight={newEnquiries > 0}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-display font-bold text-navy">Recent orders</h3>
          <ul className="mt-4 space-y-3">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <Link
                  href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                  className="font-mono font-bold text-orange hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <span className="text-slate-brand">{o.companyName}</span>
                <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-bold capitalize text-navy">
                  {o.status}
                </span>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="text-sm text-slate-brand">No orders yet.</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-display font-bold text-navy">Catalogue</h3>
          <p className="mt-2 text-3xl font-bold text-navy">{productCount}</p>
          <p className="text-sm text-slate-brand">products in database</p>
          <Link
            href="/admin/products"
            className="mt-4 inline-block text-sm font-semibold text-orange hover:underline"
          >
            View products with cost columns →
          </Link>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${
        highlight
          ? "border-orange/40 bg-orange/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-brand">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold text-navy">{value}</p>
    </Link>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { OrderTracker } from "@/components/order-tracker";
import { getOrderByNumber } from "@/lib/store";
import { gbp } from "@/lib/format";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-slate-brand hover:text-orange">
        ← All orders
      </Link>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-navy">
        {order.orderNumber}
      </h2>
      <p className="text-sm text-slate-brand">
        {order.companyName} · {order.email}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminOrderActions
          orderNumber={order.orderNumber}
          currentStatus={order.status}
          carrier={order.carrier}
          trackingNumber={order.trackingNumber}
        />
        <OrderTracker order={order} />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-display font-bold text-navy">Line items</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {order.lineItems.map((li) => (
            <li key={li.sku} className="flex justify-between gap-4">
              <span>
                {li.name} × {li.quantity}
                <span className="ml-2 font-mono text-xs text-slate-brand">{li.sku}</span>
              </span>
              <span className="font-semibold">{gbp(li.unitPriceExVat * li.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-slate-100 pt-4 font-bold">
          Total: {gbp(order.totalIncVat)} inc-VAT
        </p>
        {order.notes && (
          <p className="mt-3 text-sm text-slate-brand">
            <strong>Notes:</strong> {order.notes}
          </p>
        )}
      </section>
    </div>
  );
}

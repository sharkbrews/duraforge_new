import Link from "next/link";
import { getAllOrders } from "@/lib/store";
import { gbp } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/order-status";
import type { PickPackStatus } from "@/lib/types";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFilter = statusParam as PickPackStatus | undefined;
  const orders = await getAllOrders(statusFilter);

  const filters: { value?: PickPackStatus; label: string }[] = [
    { label: "All" },
    { value: "received", label: "Received" },
    { value: "picking", label: "Picking" },
    { value: "packed", label: "Packed" },
    { value: "despatched", label: "Despatched" },
    { value: "delivered", label: "Delivered" },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Orders</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              statusFilter === f.value || (!statusFilter && !f.value)
                ? "bg-orange text-white"
                : "bg-white text-navy ring-1 ring-slate-200 hover:ring-orange"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-brand">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                    className="font-mono font-bold text-orange hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-navy">{o.companyName}</p>
                  <p className="text-xs text-slate-brand">{o.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-navy/10 px-2 py-1 text-xs font-bold text-navy">
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{gbp(o.totalIncVat)}</td>
                <td className="px-4 py-3 text-slate-brand">
                  {new Date(o.createdAt).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-8 text-center text-slate-brand">No orders match this filter.</p>
        )}
      </div>
    </div>
  );
}

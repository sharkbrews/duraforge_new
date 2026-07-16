import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/store";
import { gbp } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = {
  title: "VAT invoice | Duraforge UK",
  robots: { index: false, follow: false },
};

const COMPANY = {
  name: "Duraforge UK Ltd",
  addressLines: ["Unit 1, Industrial Estate", "Swanscombe", "Kent", "DA10 1BZ"],
  companyNo: "16679838",
  vatNumber: process.env.COMPANY_VAT_NUMBER ?? "GB — pending registration",
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/account/login");

  const { orderNumber } = await params;
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  // Owner or admin may view the invoice.
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();

  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-GB");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
          className="text-sm text-slate-brand hover:text-orange"
        >
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-100 pb-6">
          <div>
            <p className="font-display text-2xl font-extrabold text-navy">
              DURAFORGE <span className="text-orange">UK</span>
            </p>
            <p className="mt-2 text-xs text-slate-brand">
              {COMPANY.addressLines.map((l) => (
                <span key={l}>
                  {l}
                  <br />
                </span>
              ))}
            </p>
            <p className="mt-2 text-xs text-slate-brand">
              Company No. {COMPANY.companyNo}
              <br />
              VAT No. {COMPANY.vatNumber}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-xl font-extrabold text-navy">VAT INVOICE</h1>
            <p className="mt-2 text-sm font-mono font-bold text-navy">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-xs text-slate-brand">Date: {invoiceDate}</p>
          </div>
        </header>

        <section className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-brand">
            Bill to
          </p>
          <p className="mt-2 text-sm font-semibold text-navy">{order.companyName}</p>
          <address className="mt-1 not-italic text-sm text-slate-brand">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
            <br />
            {order.shippingAddress.city}
            {order.shippingAddress.county && `, ${order.shippingAddress.county}`}
            <br />
            {order.shippingAddress.postcode}
          </address>
          <p className="mt-1 text-xs text-slate-brand">{order.email}</p>
        </section>

        <table className="mt-8 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-brand">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit (ex-VAT)</th>
              <th className="py-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.lineItems.map((li) => (
              <tr key={li.sku}>
                <td className="py-2">
                  {li.name}
                  <span className="ml-2 font-mono text-xs text-slate-brand">
                    {li.sku}
                  </span>
                </td>
                <td className="py-2 text-center">{li.quantity}</td>
                <td className="py-2 text-right">{gbp(li.unitPriceExVat)}</td>
                <td className="py-2 text-right">
                  {gbp(li.unitPriceExVat * li.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-brand">Subtotal (ex-VAT)</dt>
              <dd>{gbp(order.subtotalExVat)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-brand">VAT @ 20%</dt>
              <dd>{gbp(order.vatAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-navy">
              <dt>Total</dt>
              <dd>{gbp(order.totalIncVat)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-10 border-t border-slate-100 pt-4 text-xs text-slate-brand">
          <p>
            Payment method: {order.paymentMethod === "bacs" ? "BACS bank transfer" : "Card"}
            {order.paymentMethod === "bacs" && " — order held until payment clears."}
          </p>
          <p className="mt-1">
            Thank you for your order. Trade terms apply. Returns for faulty goods only.
          </p>
        </footer>
      </article>
    </div>
  );
}

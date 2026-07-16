import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByNumber } from "@/lib/store";
import { getSessionUserId } from "@/lib/auth";
import { gbp } from "@/lib/format";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Order confirmed | Duraforge UK",
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) redirect("/shop");

  const userId = await getSessionUserId();
  if (!userId) redirect("/account/login");

  const order = await getOrderByNumber(orderNumber);
  if (!order || order.userId !== userId) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <div className="rounded-3xl border border-success/30 bg-success/5 p-10">
        <p className="text-5xl">💪</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">
          Sorted! Your seals are already being picked.
        </h1>
        <p className="mt-3 text-slate-brand">
          We&apos;re quick like that. Order reference:
        </p>
        <p className="mt-2 font-mono text-xl font-bold text-navy">{order.orderNumber}</p>
        <p className="mt-4 text-sm text-slate-brand">
          Total paid: <strong className="text-ink">{gbp(order.totalIncVat)} inc-VAT</strong>
          {order.paymentMethod === "bacs" && (
            <> · BACS reference will be emailed shortly</>
          )}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account/orders"
            className="rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            View order history
          </Link>
          <Link
            href="/shop"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-navy hover:border-orange"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

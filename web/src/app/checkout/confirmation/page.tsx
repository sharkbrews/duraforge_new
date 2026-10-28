import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByNumber, getLoyaltySummary } from "@/lib/store";
import { getSessionUser, getSessionUserId } from "@/lib/auth";
import { gbp } from "@/lib/format";
import { coinsForOrder, SPIN_ORDER_THRESHOLD } from "@/lib/loyalty";
import { SpinWheelPrompt } from "@/components/spin-wheel-prompt";
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

  const [order, loyalty, user] = await Promise.all([
    getOrderByNumber(orderNumber),
    getLoyaltySummary(userId),
    getSessionUser(),
  ]);
  if (!order || order.userId !== userId) notFound();

  const paidAndReconciled = order.paymentStatus === "paid_reconciled";
  const coinsEarned = paidAndReconciled ? coinsForOrder(order.totalIncVat) : 0;
  const showSpin =
    paidAndReconciled &&
    loyalty.canSpin &&
    order.totalIncVat >= SPIN_ORDER_THRESHOLD;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <div className="rounded-3xl border border-success/30 bg-success/5 p-10">
        <p className="text-5xl">💪</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">
          Trade order request received
        </h1>
        <p className="mt-3 text-slate-brand">
          We&apos;ll review availability and confirm your order and trade terms.
        </p>
        <p className="mt-2 font-mono text-xl font-bold text-navy">{order.orderNumber}</p>
        <p className="mt-4 text-sm text-slate-brand">
          Requested value: <strong className="text-ink">{gbp(order.totalIncVat)}</strong>
          {" "}· No payment has been taken
        </p>

        {coinsEarned > 0 && (
          <p className="mt-4 rounded-lg bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
            +{coinsEarned} DuraCoins earned
            {user?.isProMember && " · PRO member 10% discount active on future orders"}
          </p>
        )}

        <SpinWheelPrompt canSpin={loyalty.canSpin} showPrompt={showSpin} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/account"
            className="rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            View DuraCoins &amp; badges
          </Link>
          <Link
            href="/account/orders"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-navy hover:border-orange"
          >
            Order history
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InvoicePaymentStatus } from "@/lib/types";

const PAYMENT_STATUSES: { value: InvoicePaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid_pending_reconciliation", label: "Paid — pending reconciliation" },
  { value: "paid_reconciled", label: "Paid and reconciled" },
];

export function AdminPaymentActions({
  orderNumber,
  currentStatus,
}: {
  orderNumber: string;
  currentStatus: InvoicePaymentStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updatePaymentStatus() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: status }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Payment update failed.");
        return;
      }
      setMessage("Payment status updated.");
      router.refresh();
    } catch {
      setMessage("Could not update payment status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-display font-bold text-navy">Invoice payment</h2>
      <p className="mt-1 text-xs text-slate-brand">
        Loyalty rewards are issued only after full payment is reconciled.
      </p>
      <label className="mt-4 block text-sm">
        <span className="text-xs font-bold text-slate-brand">Payment status</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as InvoicePaymentStatus)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {PAYMENT_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={updatePaymentStatus}
        disabled={loading}
        className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save payment status"}
      </button>
      {message && <p className="mt-3 text-sm text-success">{message}</p>}
    </section>
  );
}

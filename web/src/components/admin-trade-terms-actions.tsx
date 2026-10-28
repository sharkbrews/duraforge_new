"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TradeTermsStatus } from "@/lib/types";

const TRADE_TERMS_STATUSES: { value: TradeTermsStatus; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "approved_net_30", label: "Approved — 30-day terms" },
  { value: "declined", label: "Declined — 30-day terms" },
];

export function AdminTradeTermsActions({
  orderNumber,
  currentStatus,
}: {
  orderNumber: string;
  currentStatus: TradeTermsStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/trade-terms`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Trade-terms update failed.");
        return;
      }
      setMessage("Trade terms updated.");
      router.refresh();
    } catch {
      setMessage("Could not update trade terms.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-display font-bold text-navy">30-day trade terms</h2>
      <p className="mt-1 text-xs text-slate-brand">
        Record the credit decision separately from order fulfilment and payment.
      </p>
      <label className="mt-4 block text-sm">
        <span className="text-xs font-bold text-slate-brand">Decision</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TradeTermsStatus)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {TRADE_TERMS_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={updateStatus}
        disabled={loading}
        className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save trade-terms decision"}
      </button>
      {message && <p className="mt-3 text-sm text-success">{message}</p>}
    </section>
  );
}

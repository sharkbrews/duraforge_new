"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PickPackStatus } from "@/lib/types";
import { PICK_PACK_STAGES, STATUS_LABELS } from "@/lib/order-status";

export function AdminOrderActions({
  orderNumber,
  currentStatus,
  carrier,
  trackingNumber,
}: {
  orderNumber: string;
  currentStatus: PickPackStatus;
  carrier?: string;
  trackingNumber?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<PickPackStatus>(currentStatus);
  const [carrierVal, setCarrierVal] = useState(carrier ?? "DPD");
  const [trackingVal, setTrackingVal] = useState(trackingNumber ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpdate() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            carrier: status === "despatched" ? carrierVal : undefined,
            trackingNumber: status === "despatched" ? trackingVal : undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Update failed.");
        setLoading(false);
        return;
      }
      setMessage("Status updated.");
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-display font-bold text-navy">Update status</h2>
      <p className="mt-1 text-xs text-slate-brand">
        Tap the stage — warehouse-friendly, five buttons.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PICK_PACK_STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              status === s
                ? "bg-orange text-white"
                : "bg-slate-100 text-navy hover:bg-slate-200"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {status === "despatched" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-brand">Carrier</span>
            <input
              value={carrierVal}
              onChange={(e) => setCarrierVal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold text-slate-brand">Tracking number</span>
            <input
              value={trackingVal}
              onChange={(e) => setTrackingVal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.includes("failed") ? "text-red-600" : "text-success"}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpdate}
        disabled={loading}
        className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save status"}
      </button>
    </div>
  );
}

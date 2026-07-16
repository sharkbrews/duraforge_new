"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminCoinAdjust({
  userId,
  companyName,
  currentBalance,
}: {
  userId: string;
  companyName: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/coins`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: parseInt(amount, 10),
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not adjust.");
        return;
      }
      setAmount("");
      setReason("");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <p className="text-xs font-bold text-slate-brand">
        Adjust coins for {companyName} (current: {currentBalance.toLocaleString()})
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          required
          placeholder="+/- amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          required
          placeholder="Reason (e.g. goodwill)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Adjust"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

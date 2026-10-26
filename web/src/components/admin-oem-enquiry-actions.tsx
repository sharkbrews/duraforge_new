"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminOemEnquiryActions({
  enquiryId,
  status,
}: {
  enquiryId: string;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkReviewed() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/oem-enquiries/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REVIEWED" }),
    });
    setLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not update enquiry.");
      return;
    }
    router.refresh();
  }

  if (status === "REVIEWED") {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Reviewed</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleMarkReviewed}
        disabled={loading}
        className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "…" : "Mark reviewed"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EnquiryStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: EnquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

export function AdminEnquiryActions({
  enquiryId,
  currentStatus,
}: {
  enquiryId: string;
  currentStatus: EnquiryStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/enquiries/${enquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? "…" : "Update"}
      </button>
    </div>
  );
}

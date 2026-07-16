import Link from "next/link";
import { AdminEnquiryActions } from "@/components/admin-enquiry-actions";
import { getEnquiries } from "@/lib/store";
import type { EnquiryStatus } from "@/lib/types";

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFilter = statusParam as EnquiryStatus | undefined;
  const enquiries = await getEnquiries(statusFilter);

  const filters: { value?: EnquiryStatus; label: string }[] = [
    { label: "All" },
    { value: "new", label: "New" },
    { value: "read", label: "Read" },
    { value: "replied", label: "Replied" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Enquiry inbox</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/enquiries?status=${f.value}` : "/admin/enquiries"}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              statusFilter === f.value || (!statusFilter && !f.value)
                ? "bg-orange text-white"
                : "bg-white text-navy ring-1 ring-slate-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {enquiries.map((e) => (
          <li
            key={e.id}
            className={`rounded-2xl border bg-white p-5 ${
              e.status === "new" ? "border-orange/40 ring-1 ring-orange/20" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{e.name}</p>
                {e.companyName && (
                  <p className="text-sm text-slate-brand">{e.companyName}</p>
                )}
                <p className="text-sm">
                  <a href={`mailto:${e.email}`} className="text-orange hover:underline">
                    {e.email}
                  </a>
                  {e.phone && <span className="text-slate-brand"> · {e.phone}</span>}
                </p>
                <p className="mt-1 text-xs text-slate-brand">
                  {new Date(e.createdAt).toLocaleString("en-GB")}
                </p>
              </div>
              <AdminEnquiryActions enquiryId={e.id} currentStatus={e.status} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{e.message}</p>
          </li>
        ))}
        {enquiries.length === 0 && (
          <p className="text-center text-slate-brand">Inbox clear. Nice one.</p>
        )}
      </ul>
    </div>
  );
}

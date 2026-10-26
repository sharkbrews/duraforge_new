import { AdminOemEnquiryActions } from "@/components/admin-oem-enquiry-actions";
import { listOemEnquiriesForSales } from "@/lib/oem-enquiry";

export default async function AdminOemEnquiriesPage() {
  const enquiries = await listOemEnquiriesForSales();

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">OEM part enquiries</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Customer lists from the OEM Knowledge Base. Check each OEM part against Duraforge stock and mark it reviewed.
      </p>

      <ul className="mt-6 space-y-4">
        {enquiries.map((e) => (
          <li
            key={e.id}
            className={`rounded-2xl border bg-white p-5 ${
              e.status === "SUBMITTED" ? "border-orange/40 ring-1 ring-orange/20" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{e.user.companyName || e.user.email}</p>
                <p className="text-sm">
                  <a href={`mailto:${e.user.email}`} className="text-orange hover:underline">
                    {e.user.email}
                  </a>
                  {e.user.phone && <span className="text-slate-brand"> · {e.user.phone}</span>}
                </p>
                <p className="mt-1 text-xs text-slate-brand">
                  {e.status === "SUBMITTED" ? "Submitted" : "Reviewed"}{" "}
                  {e.submittedAt && new Date(e.submittedAt).toLocaleString("en-GB")}
                  {e.reviewedAt && <> · Reviewed {new Date(e.reviewedAt).toLocaleString("en-GB")}</>}
                </p>
              </div>
              <AdminOemEnquiryActions enquiryId={e.id} status={e.status} />
            </div>

            {e.note && <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{e.note}</p>}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-brand">
                  <tr>
                    <th className="py-2 pr-3">Brand</th>
                    <th className="py-2 pr-3">Machine</th>
                    <th className="py-2 pr-3">Application</th>
                    <th className="py-2 pr-3">OEM part no.</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {e.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{item.brand}</td>
                      <td className="py-2 pr-3">{item.machineName}</td>
                      <td className="py-2 pr-3">{item.application}</td>
                      <td className="py-2 pr-3 font-mono">{item.oemPartNumber}</td>
                      <td className="py-2 pr-3 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>
        ))}
        {enquiries.length === 0 && (
          <p className="text-center text-slate-brand">No OEM enquiries yet.</p>
        )}
      </ul>
    </div>
  );
}

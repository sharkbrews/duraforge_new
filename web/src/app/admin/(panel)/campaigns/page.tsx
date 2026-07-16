import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminCampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold text-navy">Campaigns</h2>
      <p className="mt-1 text-sm text-slate-brand">
        Marketing landing pages. Klaviyo email sends link here (Opus wires Klaviyo in Stage 4b).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-brand">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-navy">{c.title}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      c.isActive ? "bg-success/15 text-success" : "bg-slate-100 text-slate-brand"
                    }`}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/campaigns/${c.slug}`}
                    className="font-semibold text-orange hover:underline"
                    target="_blank"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <p className="p-8 text-center text-slate-brand">
            No campaigns yet. Run <code className="rounded bg-slate-100 px-1">npm run db:seed</code>.
          </p>
        )}
      </div>
    </div>
  );
}

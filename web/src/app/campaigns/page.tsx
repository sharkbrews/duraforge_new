import Link from "next/link";
import { getActiveCampaigns } from "@/lib/store";

export default async function CampaignsIndexPage() {
  const campaigns = await getActiveCampaigns();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">Current offers</h1>
      <p className="mt-2 text-slate-brand">
        Trade-only deals. No consumer fluff — just better prices and faster seals.
      </p>

      <ul className="mt-10 space-y-6">
        {campaigns.map((c) => (
          <li key={c.id}>
            <Link
              href={`/campaigns/${c.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="font-display text-xl font-bold text-navy">{c.title}</h2>
              {c.subtitle && (
                <p className="mt-2 text-sm text-slate-brand">{c.subtitle}</p>
              )}
              <span className="mt-4 inline-block text-sm font-semibold text-orange">
                View offer →
              </span>
            </Link>
          </li>
        ))}
        {campaigns.length === 0 && (
          <p className="text-slate-brand">No active campaigns right now. Check back soon.</p>
        )}
      </ul>
    </div>
  );
}

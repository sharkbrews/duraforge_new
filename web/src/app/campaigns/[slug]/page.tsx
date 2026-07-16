import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignBySlug } from "@/lib/store";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) notFound();

  return (
    <div className="bg-slate-100">
      <div className="bg-navy px-4 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-orange">Campaign</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">{campaign.title}</h1>
          {campaign.subtitle && (
            <p className="mt-4 text-lg text-slate-200">{campaign.subtitle}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-ink">
            {campaign.body}
          </div>
          {campaign.ctaLabel && campaign.ctaHref && (
            <Link
              href={campaign.ctaHref}
              className="mt-8 inline-block rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange-600"
            >
              {campaign.ctaLabel}
            </Link>
          )}
        </article>
        <Link href="/campaigns" className="mt-6 inline-block text-sm text-slate-brand hover:text-orange">
          ← All offers
        </Link>
      </div>
    </div>
  );
}

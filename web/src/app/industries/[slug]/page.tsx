import Link from "next/link";
import { notFound } from "next/navigation";
import { industries } from "../page";

const extra: Record<string, { body: string; cta: string }> = {
  "plant-hire": {
    body: "When a machine's off hire, you're bleeding money. We stock boom, dipper, and bucket kits for JCB 3DX, CAT 424B, Takeuchi, and more — with same-day options across Kent and SE London when you order before 11am.",
    cta: "Find a kit for your fleet",
  },
  "hydraulic-repair": {
    body: "Your customers expect a fair price and a fast turnaround. Our cross-reference tool maps FPE, Hallite, and OEM numbers to Duraforge kits — usually 25–30% cheaper. Earn DuraCoins on every order and stack milestone rewards.",
    cta: "Cross-reference a part number",
  },
  agriculture: {
    body: "Harvest doesn't wait for back-ordered seals. Kubota, Hyundai, and loader kits with honest specs — rod × bore × height in mm, materials called correctly, no nonsense claims.",
    cta: "Shop by brand",
  },
  construction: {
    body: "Civils and construction run on hydraulics. Hyva tipper kits, excavator boom sets, and telehandler seals — packed in Kent, priced for trade, not retail markup.",
    cta: "Open Seal Kit Finder",
  },
};

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = industries.find((i) => i.slug === slug);
  const detail = extra[slug];
  if (!industry || !detail) notFound();

  const ctaHref =
    slug === "hydraulic-repair"
      ? "/cross-reference"
      : slug === "agriculture"
        ? "/shop"
        : "/finder";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/industries" className="text-sm text-slate-brand hover:text-orange">
        ← All industries
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-navy">{industry.title}</h1>
      <p className="mt-6 text-slate-brand">{detail.body}</p>
      <Link
        href={ctaHref}
        className="mt-8 inline-block rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange-600"
      >
        {detail.cta} →
      </Link>
    </div>
  );
}

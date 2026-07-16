import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Industries | Duraforge UK",
};

const industries = [
  {
    slug: "plant-hire",
    title: "Plant hire",
    blurb: "Downtime costs you hire revenue. Same-day seals when a boom's weeping on site.",
  },
  {
    slug: "hydraulic-repair",
    title: "Hydraulic repair shops",
    blurb: "Margin matters. Our kits land 25–30% below catalogue house prices.",
  },
  {
    slug: "agriculture",
    title: "Agriculture & groundcare",
    blurb: "Kubota, Massey, telehandlers — kits in stock for the busy season.",
  },
  {
    slug: "construction",
    title: "Construction & civils",
    blurb: "JCB, CAT, Hyva — the machines that keep sites moving.",
  },
];

export default function IndustriesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy">Industries we serve</h1>
      <p className="mt-2 text-slate-brand">
        B2B only. If you fix cylinders for a living, we built this for you.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {industries.map((i) => (
          <li key={i.slug}>
            <Link
              href={`/industries/${i.slug}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-6 hover:border-orange/40 hover:shadow-md"
            >
              <h2 className="font-display text-lg font-bold text-navy">{i.title}</h2>
              <p className="mt-2 text-sm text-slate-brand">{i.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { industries };
